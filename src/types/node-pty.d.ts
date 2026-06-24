declare module 'node-pty' {
  import { EventEmitter } from 'events';

  interface IPtyForkOptions {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: Record<string, string>;
    encoding?: string;
    uid?: number;
    gid?: number;
    useConpty?: boolean;
    conptyInheritCursor?: boolean;
    handleFlowControl?: boolean;
    flowControlPause?: string;
    flowControlResume?: string;
  }

  interface IPty extends EventEmitter {
    pid: number;
    process: string;
    cols: number;
    rows: number;
    write(data: string): void;
    resize(columns: number, rows: number): void;
    kill(signal?: string): void;
    clear(): void;
    pause(): void;
    resume(): void;
    handleFlowControl: boolean;
    onExit(event: string, listener: (e: { exitCode: number; signal?: string }) => void): this;
    onData(event: string, listener: (data: string) => void): this;
    on(event: 'data', listener: (data: string) => void): this;
    on(event: 'exit', listener: (e: { exitCode: number; signal?: string }) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export function spawn(
    file: string,
    args: string[] | string,
    options?: IPtyForkOptions
  ): IPty;
  export type { IPty, IPtyForkOptions };
}
