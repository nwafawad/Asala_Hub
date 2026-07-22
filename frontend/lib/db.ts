import Dexie, { Table } from "dexie";
import { ContentType } from "./api";

export interface LocalCourse {
  id: string;
  title: string;
  description: string;
  educator_id: string;
  created_at: string;
  updated_at: string;
}

export interface LocalModule {
  id: string;
  course_id: string;
  title: string;
  content_type: ContentType;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface LocalAssignment {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface LocalSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  submitted_at: string;
  sync_status: "synced" | "pending" | "conflict";
  grade?: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocalTransactionLog {
  id: string;
  user_id: string;
  entity_type: "submission" | "module_progress" | "course";
  entity_id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, any>;
  client_timestamp: string;
  synced_at?: string | null;
  retry_count: number;
  error_message?: string | null;
}

export class AsalaDatabase extends Dexie {
  courses!: Table<LocalCourse, string>;
  modules!: Table<LocalModule, string>;
  assignments!: Table<LocalAssignment, string>;
  submissions!: Table<LocalSubmission, string>;
  transactionLogs!: Table<LocalTransactionLog, string>;

  constructor() {
    super("AsalaHubDB");

    this.version(1).stores({
      courses: "id, title, updated_at",
      modules: "id, course_id, order_index, updated_at",
      assignments: "id, course_id, due_date",
      submissions: "id, assignment_id, student_id, sync_status",
      transactionLogs: "id, user_id, entity_type, client_timestamp, synced_at",
    });

    this.version(2).stores({
      transactionLogs: "id, user_id, entity_type, entity_id, client_timestamp, synced_at, retry_count, [synced_at+retry_count], [entity_type+entity_id]",
      submissions: "id, assignment_id, student_id, sync_status, [assignment_id+sync_status]",
    });
  }
}


export const db = new AsalaDatabase();
