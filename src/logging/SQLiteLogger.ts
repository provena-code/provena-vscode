import { EventLogger } from "./EventLogger";
import { BatchEventHandler, EventWithCodestate, IBatchEventHandler } from "./BatchEventHandler";
import Database = require("better-sqlite3");

import mainTableSchema from './Schemas/MainTable.json';
import codestatesTableSchema from './Schemas/CodestatesTable.json';

type TypeDefinition = {
    type: string;
    max_string_length?: "ID" | "Path";
}

type TableSchema = {
    table_name: string;
    columns: {
        name: string;
        datatype: TypeDefinition;
    }[];
}

export class SQLiteLogger implements IBatchEventHandler {

    private readonly batchEventHandler: BatchEventHandler;

    private readonly database: Database.Database;

    constructor(
        private readonly databasePath: string,
    ) {
        this.batchEventHandler = new BatchEventHandler(20, 200);
        this.batchEventHandler.registerBatchEventHandler(this);

        // console.log('bsql', BetterSqlite3);
        console.log('Database', Database);
        this.database = new Database(this.databasePath, {

        });
        this.database.pragma('journal_mode = WAL');
    }

    private static mapColumnType(columnType: TypeDefinition): string {
        switch (columnType.type) {
            case 'string':
                return 'TEXT';
            case 'number':
                return 'INTEGER';
            case 'boolean':
                return 'BOOLEAN';
            default:
                throw new Error(`Unsupported column type: ${columnType}`);
        }
    }

    public initDatabase() {
        this.createOrUpdateTable(mainTableSchema);
        this.createOrUpdateTable(codestatesTableSchema);
    }

    private createOrUpdateTable(spec: TableSchema) {
        const columnDefs = spec.columns.map(col => {
            return `${col.name} ${SQLiteLogger.mapColumnType(col.datatype)}`;
        });
        const createQuery = `CREATE TABLE IF NOT EXISTS ${spec.table_name} (${columnDefs.join(', ')});`;
        this.database.prepare(createQuery).run();

        // Add each column if it does not exist
        for (const col of spec.columns) {
            const alterQuery = `ALTER TABLE ${spec.table_name} ADD COLUMN IF NOT EXISTS ${col.name} ${SQLiteLogger.mapColumnType(col.datatype)};`;
            this.database.prepare(alterQuery).run();
        }
    }

    public register(eventLogger: EventLogger) {
        eventLogger.registerEventHandler(this.batchEventHandler);
    }

    onEvents(events: EventWithCodestate[]): void {
        for (const { event, codestate } of events) {
            const eventColumns = Object.keys(event);
            const eventValues = Object.values(event);
            const placeholders = eventColumns.map(() => '?').join(', ');
            const insertEventQuery = `INSERT INTO MainTable (${eventColumns.join(', ')}) VALUES (${placeholders});`;
            this.database.prepare(insertEventQuery).run(...eventValues);

            // TODO: Codestates
        }
    }

    public flush() {
        this.batchEventHandler.flush();
    }
}