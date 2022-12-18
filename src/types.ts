export interface IManager {
    captureError(e: Error, ctx: any): Promise<void>;
}