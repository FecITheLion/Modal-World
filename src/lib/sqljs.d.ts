declare module "sql.js" {
  export type Bind = (string | number | null | Uint8Array)[];
  export interface Statement {
    bind(values?: Bind): boolean;
    step(): boolean;
    getAsObject(): Record<string, string | number | Uint8Array | null>;
    free(): boolean;
  }
  export interface Database {
    run(sql: string, params?: Bind): Database;
    exec(sql: string): { columns: string[]; values: (string | number | null | Uint8Array)[][] }[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | null) => Database;
  }
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}
