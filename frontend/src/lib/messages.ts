/**
 * Standardized User-Facing Message Catalog (SRS Section 5.9)
 * Centralizes all sync, storage, session, and conflict messaging.
 * Distinguishes blocking (modal overlays) from non-blocking (toasts/pills).
 */

export interface SystemMessageItem {
  id: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  type: 'info' | 'warning' | 'error' | 'success';
  blocking: boolean;
}

export const MSG = {
  WORKING_OFFLINE: {
    id: 'MSG_OFFLINE_01',
    title: "You're offline.",
    titleAr: "أنت الآن يعمل بدون إنترنت.",
    body: "Your work is saved and will sync when you reconnect.",
    bodyAr: "تم حفظ عملك محلياً وسيتم المزامنة فور إعادة الاتصال.",
    type: 'info',
    blocking: false,
  },
  SYNC_IN_PROGRESS: {
    id: 'MSG_SYNC_01',
    title: "Syncing your latest work…",
    titleAr: "جاري مزامنة أحدث أعمالك...",
    body: "Connecting to campus intranet vault.",
    bodyAr: "جاري الاتصال بخادم الجامعة الداخلي.",
    type: 'info',
    blocking: false,
  },
  SYNC_FAILED: {
    id: 'MSG_SYNC_02',
    title: "Couldn't sync right now.",
    titleAr: "تعذرت المزامنة الآن.",
    body: "We'll retry automatically with exponential backoff.",
    bodyAr: "سنعيد المحاولة تلقائياً بشكل متدرج.",
    type: 'warning',
    blocking: false,
  },
  STORAGE_FULL: {
    id: 'MSG_STORE_01',
    title: "Your device is low on storage.",
    titleAr: "مساحة التخزين على جهازك منخفضة جداً.",
    body: "Please connect to sync before adding more work.",
    bodyAr: "يرجى الاتصال بالمزامنة قبل إضافة المزيد من الأعمال لتجنب فقدان البيانات.",
    type: 'error',
    blocking: true,
  },
  QUEUE_FULL: {
    id: 'MSG_STORE_02',
    title: "Maximum offline queue reached.",
    titleAr: "وصلت قائمة المزامنة للحد الأقصى.",
    body: "You've reached 150 offline transactions. Please sync before continuing.",
    bodyAr: "وصلت إلى 150 معاملة بدون إنترنت. يرجى المزامنة للمتابعة.",
    type: 'error',
    blocking: true,
  },
  SAVE_FAILED: {
    id: 'MSG_SAVE_01',
    title: "We couldn't save your work locally.",
    titleAr: "تعذر حفظ عملك محلياً.",
    body: "Please free up space and try again.",
    bodyAr: "يرجى تحرير مساحة تخزين والمحاولة مرة أخرى.",
    type: 'error',
    blocking: true,
  },
  SESSION_EXPIRED: {
    id: 'MSG_AUTH_01',
    title: "Your offline session has expired.",
    titleAr: "انتهت صلاحية الجلسة المحلية.",
    body: "Please sign in again; your saved work is safe.",
    bodyAr: "يرجى تسجيل الدخول مجدداً؛ جميع مسوداتك وملاحظاتك آمنة.",
    type: 'warning',
    blocking: true,
  },
  SYNC_CONFLICT: {
    id: 'MSG_CONF_01',
    title: "Some changes were updated by your instructor and have been applied.",
    titleAr: "تم تحديث بعض التغييرات بواسطة المحاضر وتم تطبيقها.",
    body: "Educator server sequence #104 resolved.",
    bodyAr: "تم تطبيق تسلسل الخادم التابع للمحاضر بنجاح.",
    type: 'info',
    blocking: false,
  },
} as const;
