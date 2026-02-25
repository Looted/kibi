export interface PrologOptions {
    swiplPath?: string;
    timeout?: number;
}
export interface QueryResult {
    success: boolean;
    bindings: Record<string, string>;
    error?: string;
}
export declare class PrologProcess {
    private process;
    private swiplPath;
    private timeout;
    private outputBuffer;
    private errorBuffer;
    private cache;
    private useOneShotMode;
    private attachedKbPath;
    constructor(options?: PrologOptions);
    start(): Promise<void>;
    private waitForReady;
    query(goal: string | string[]): Promise<QueryResult>;
    invalidateCache(): void;
    private isCacheableGoal;
    private queryOneShot;
    private execOneShot;
    private normalizeGoal;
    private extractBindings;
    private translateError;
    isRunning(): boolean;
    getPid(): number;
    terminate(): Promise<void>;
}
