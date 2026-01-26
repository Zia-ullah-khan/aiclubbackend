import Docker from 'dockerode';
import { config } from '../config';
import { VM, IVM, User } from '../models';
import { ensureUserDirectory } from '../lib/security';
import path from 'path';

// Initialize Docker client
const docker = new Docker({ socketPath: config.dockerSocketPath });

// Track used ports
const usedPorts = new Set<number>();

/**
 * Get next available SSH port
 */
async function getNextAvailablePort(): Promise<number> {
    // Load existing port mappings from DB
    const existingVMs = await VM.find({ status: { $ne: 'terminated' } });
    existingVMs.forEach(vm => usedPorts.add(vm.sshPort));

    let port = config.vm.baseSSHPort;
    while (usedPorts.has(port)) {
        port++;
    }
    usedPorts.add(port);
    return port;
}

/**
 * Free a port when VM is terminated
 */
function freePort(port: number): void {
    usedPorts.delete(port);
}

/**
 * Create and provision a new VM (Docker container) for a user
 */
export async function provisionVM(
    userId: string,
    vmName: string,
    options: {
        image?: string;
        memoryLimit?: number;
        cpuShares?: number;
    } = {}
): Promise<IVM> {
    // Check user's VM count
    const existingVMs = await VM.find({
        ownerId: userId,
        status: { $in: ['running', 'stopped', 'creating'] }
    });

    if (existingVMs.length >= config.vm.maxVMsPerUser) {
        throw new Error(`Maximum VM limit (${config.vm.maxVMsPerUser}) reached`);
    }

    // Check user credits
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    if (user.credits < config.credits.vmCostPerHour) {
        throw new Error('Insufficient credits to provision VM');
    }

    const image = options.image || config.vm.defaultImage;
    const memoryLimit = options.memoryLimit || config.vm.memoryLimit;
    const cpuShares = options.cpuShares || 512;

    // Ensure user directory exists
    const userDir = ensureUserDirectory(userId);
    const projectsDir = path.join(userDir, 'projects');

    // Get available port
    const sshPort = await getNextAvailablePort();

    // Pull image if not exists
    try {
        await docker.getImage(image).inspect();
    } catch {
        console.log(`Pulling image: ${image}`);
        await new Promise<void>((resolve, reject) => {
            docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, (err: Error | null) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        });
    }

    // Create container with security settings
    const container = await docker.createContainer({
        Image: image,
        name: `aiclub-${userId}-${vmName}-${Date.now()}`,
        Hostname: vmName,
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        // Keep container running with interactive bash
        // The container will stay alive as long as bash is running
        Cmd: ['/bin/bash'],
        User: 'root', // Start as root to set up SSH, then switch
        WorkingDir: '/workspace',
        HostConfig: {
            // Port mappings
            PortBindings: {
                '22/tcp': [{ HostPort: sshPort.toString() }],
            },
            // Volume mappings - ONLY mount user's specific directory
            Binds: [
                `${projectsDir}:/workspace:rw`,
            ],
            // Resource limits
            Memory: memoryLimit,
            MemorySwap: memoryLimit, // Prevent swap usage
            PidsLimit: config.vm.pidsLimit,
            CpuShares: cpuShares,
            // Security settings
            CapDrop: ['ALL'],
            CapAdd: ['CHOWN', 'SETUID', 'SETGID', 'NET_BIND_SERVICE'],
            SecurityOpt: ['no-new-privileges:true'],
            // Network isolation - use bridge, not host
            NetworkMode: 'bridge',
            // Read-only root filesystem with exceptions
            ReadonlyRootfs: false, // Can't be true if we need to install packages
            // Auto-remove on stop (optional)
            AutoRemove: false,
            // Restart policy
            RestartPolicy: {
                Name: 'on-failure',
                MaximumRetryCount: 3,
            },
        },
        ExposedPorts: {
            '22/tcp': {},
        },
        Labels: {
            'aiclub.owner': userId,
            'aiclub.vm-name': vmName,
            'aiclub.managed': 'true',
        },
    });

    // Create VM record in database
    const vm = new VM({
        ownerId: userId,
        containerId: container.id,
        name: vmName,
        status: 'creating',
        sshPort,
        image,
        memoryLimit,
        cpuShares,
    });

    await vm.save();

    // Start container
    await container.start();

    // Get container info
    const info = await container.inspect();

    // Update VM with IP address
    vm.status = 'running';
    // Get IP from first network or direct IPAddress
    const networks = info.NetworkSettings.Networks;
    const networkName = Object.keys(networks)[0];
    vm.ipAddress = networkName ? networks[networkName]?.IPAddress : undefined;
    vm.lastStartedAt = new Date();
    await vm.save();

    return vm;
}

/**
 * Start a stopped VM
 */
export async function startVM(vmId: string, userId: string): Promise<IVM> {
    const vm = await VM.findOne({ _id: vmId, ownerId: userId });
    if (!vm) {
        throw new Error('VM not found');
    }

    if (vm.status === 'running') {
        throw new Error('VM is already running');
    }

    if (vm.status === 'terminated') {
        throw new Error('Cannot start a terminated VM');
    }

    // Check credits
    const user = await User.findById(userId);
    if (!user || user.credits < config.credits.vmCostPerHour) {
        throw new Error('Insufficient credits');
    }

    const container = docker.getContainer(vm.containerId);

    // Try to start the container (it might already be running)
    try {
        await container.start();
    } catch (err: any) {
        // Ignore "container already started" error (304)
        if (err.statusCode !== 304) {
            throw err;
        }
    }

    // Get updated container info for IP
    const info = await container.inspect();
    const networks = info.NetworkSettings.Networks;
    const networkName = Object.keys(networks)[0];

    vm.status = 'running';
    vm.ipAddress = networkName ? networks[networkName]?.IPAddress : undefined;
    vm.lastStartedAt = new Date();
    await vm.save();

    return vm;
}

/**
 * Stop a running VM
 */
export async function stopVM(vmId: string, userId: string): Promise<IVM> {
    const vm = await VM.findOne({ _id: vmId, ownerId: userId });
    if (!vm) {
        throw new Error('VM not found');
    }

    if (vm.status !== 'running') {
        throw new Error('VM is not running');
    }

    const container = docker.getContainer(vm.containerId);

    // Try to stop the container (it might already be stopped)
    try {
        await container.stop();
    } catch (err: any) {
        // Ignore "container already stopped" error (304)
        if (err.statusCode !== 304) {
            throw err;
        }
    }

    // Calculate runtime
    if (vm.lastStartedAt) {
        const runtime = Math.floor((Date.now() - vm.lastStartedAt.getTime()) / 1000);
        vm.totalRuntime += runtime;

        // Deduct credits based on runtime
        const hoursUsed = runtime / 3600;
        const creditsUsed = Math.ceil(hoursUsed * config.credits.vmCostPerHour);
        vm.creditsConsumed += creditsUsed;

        await User.findByIdAndUpdate(userId, {
            $inc: { credits: -creditsUsed }
        });
    }

    vm.status = 'stopped';
    vm.lastStoppedAt = new Date();
    await vm.save();

    return vm;
}

/**
 * Terminate and remove a VM
 */
export async function terminateVM(vmId: string, userId: string): Promise<void> {
    const vm = await VM.findOne({ _id: vmId, ownerId: userId });
    if (!vm) {
        throw new Error('VM not found');
    }

    const container = docker.getContainer(vm.containerId);

    try {
        // Stop if running
        const info = await container.inspect();
        if (info.State.Running) {
            await container.stop();
        }

        // Remove container
        await container.remove({ force: true });
    } catch (error) {
        console.error('Error removing container:', error);
    }

    // Free the port
    freePort(vm.sshPort);

    // Update VM status
    vm.status = 'terminated';
    await vm.save();
}

/**
 * Get VM status and info
 */
export async function getVMStatus(vmId: string, userId: string): Promise<{
    vm: IVM;
    containerStatus?: any;
}> {
    const vm = await VM.findOne({ _id: vmId, ownerId: userId });
    if (!vm) {
        throw new Error('VM not found');
    }

    let containerStatus = null;

    try {
        const container = docker.getContainer(vm.containerId);
        const info = await container.inspect();
        containerStatus = {
            running: info.State.Running,
            status: info.State.Status,
            startedAt: info.State.StartedAt,
            pid: info.State.Pid,
        };

        // Sync status if different
        const actualStatus = info.State.Running ? 'running' : 'stopped';
        if (vm.status !== 'terminated' && vm.status !== actualStatus) {
            vm.status = actualStatus;
            await vm.save();
        }
    } catch (error) {
        // Container might not exist
        if (vm.status !== 'terminated') {
            vm.status = 'error';
            await vm.save();
        }
    }

    return { vm, containerStatus };
}

/**
 * List all VMs for a user
 */
export async function listUserVMs(userId: string): Promise<IVM[]> {
    return VM.find({ ownerId: userId }).sort({ createdAt: -1 });
}

/**
 * Execute a command in a VM container
 */
export async function execInVM(
    vmId: string,
    userId: string,
    command: string[]
): Promise<{ output: string; exitCode: number }> {
    const vm = await VM.findOne({ _id: vmId, ownerId: userId });
    if (!vm) {
        throw new Error('VM not found');
    }

    if (vm.status !== 'running') {
        throw new Error('VM is not running');
    }

    const container = docker.getContainer(vm.containerId);

    const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        User: 'user',
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    return new Promise((resolve, reject) => {
        let output = '';

        stream.on('data', (chunk: Buffer) => {
            output += chunk.toString();
        });

        stream.on('end', async () => {
            const info = await exec.inspect();
            resolve({
                output,
                exitCode: info.ExitCode || 0,
            });
        });

        stream.on('error', reject);
    });
}

/**
 * Get Docker container stream for terminal
 */
export async function attachToVM(vmId: string, userId: string): Promise<{ stream: NodeJS.ReadWriteStream; resize: (w: number, h: number) => Promise<void> }> {
    const vm = await VM.findOne({ _id: vmId, ownerId: userId });
    if (!vm) {
        throw new Error('VM not found');
    }

    if (vm.status !== 'running') {
        throw new Error('VM is not running');
    }

    const container = docker.getContainer(vm.containerId);

    const exec = await container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        User: 'root',
    });

    const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true,
    });

    const resize = async (w: number, h: number) => {
        await exec.resize({ w, h });
    };

    return { stream, resize };
}

// ============== Admin Functions ==============

/**
 * Get all VMs (admin only)
 */
export async function listAllVMs(): Promise<IVM[]> {
    return VM.find()
        .populate('ownerId', 'username email')
        .sort({ createdAt: -1 });
}

/**
 * Get all running containers on the host
 */
export async function listAllContainers(): Promise<Docker.ContainerInfo[]> {
    return docker.listContainers({ all: true });
}

/**
 * Force stop any container (admin emergency)
 */
export async function forceStopContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 0 });

    // Update VM record if exists
    const vm = await VM.findOne({ containerId });
    if (vm) {
        vm.status = 'stopped';
        vm.lastStoppedAt = new Date();
        await vm.save();
    }
}

/**
 * Force remove any container (admin emergency)
 */
export async function forceRemoveContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.remove({ force: true });

    // Update VM record if exists
    const vm = await VM.findOne({ containerId });
    if (vm) {
        freePort(vm.sshPort);
        vm.status = 'terminated';
        await vm.save();
    }
}

/**
 * Get Docker system info
 */
export async function getDockerInfo(): Promise<object> {
    return docker.info();
}

/**
 * Check Docker connection
 */
export async function pingDocker(): Promise<boolean> {
    try {
        await docker.ping();
        return true;
    } catch {
        return false;
    }
}
