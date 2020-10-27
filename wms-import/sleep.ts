
export async function sleep(durationMs:number): Promise<void> {
    return new Promise<void>(
        (resolve: () => void, reject: (error: string) => void) => {
            setTimeout(resolve,durationMs);
        });
}
