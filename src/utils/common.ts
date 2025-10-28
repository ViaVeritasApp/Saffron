export function parseField(data: string | any[]): string | undefined {
    if (Array.isArray(data) && data[0])
        return data[0];
    else {
        return data as string;
    }
}

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
