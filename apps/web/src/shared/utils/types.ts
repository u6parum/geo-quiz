export type PropsOfType<T, TT> = {
  [P in keyof T as P extends keyof T ? (T[P] extends TT ? P : never) : never]: T[P];
};

export type Nullable<T> = T | null;
