
export interface Observer<DATA> {
    next: (data: DATA) => boolean;
    error: (s: string) => void;
    complete: () => void;
}

export interface Stream<DATA> {
    read(observer: Observer<DATA>): void;
}

