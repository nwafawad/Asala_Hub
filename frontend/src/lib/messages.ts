/**
 * Standardized User-Facing Message Catalog
 * Implementation addition not specified in SRS (traced to notification behavior in SRS §3.1; supports FR 1.1-FR 3.3 & NFR 1).
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
    body: "Educator server sequence resolved.",
    bodyAr: "تم تطبيق تسلسل الخادم التابع للمحاضر بنجاح.",
    type: 'info',
    blocking: false,
  },
  GRADED_REJECTION: {
    id: 'MSG_CONF_02',
    title: "Edit not saved — assignment already graded.",
    titleAr: "لم يتم حفظ التعديل - تم تقييم الواجب بالفعل.",
    body: "Your educator has graded this assignment. Your edit couldn't be applied. Please contact your educator if you have questions.",
    bodyAr: "قام المعلم بتقييم هذا الواجب. لا يمكن تطبيق التعديلات. يرجى التواصل مع المعلم لأي استفسارات.",
    type: 'error',
    blocking: true,
  },
  VERSION_CONFLICT: {
    id: 'MSG_CONF_03',
    title: "A newer version of this draft exists.",
    titleAr: "توجد نسخة أحدث من هذه المسودة.",
    body: "Your instructor's version has been added to your Draft History. Open the history panel to compare and choose which version to keep.",
    bodyAr: "تمت إضافة نسخة المحاضر إلى سجل المسودات. افتح لوحة السجل للمقارنة واختيار النسخة المناسبة.",
    type: 'warning',
    blocking: false,
  },
  UNAUTHORIZED_OFFLINE_SESSION: {
    id: 'MSG_AUTH_02',
    title: "Online sync requires server authentication.",
    titleAr: "تتطلب المزامنة عبر الإنترنت تسجيل الدخول بالحساب الرسمي.",
    body: "You are currently signed in with a local offline session. Please log in with a registered server account to sync changes.",
    bodyAr: "أنت مسجل الدخول حالياً بجلسة محليّة. يرجى تسجيل الدخول بحساب الخادم المسجّل للمزامنة.",
    type: 'warning',
    blocking: true,
  },
} as const;

export type MessageKey = keyof typeof MSG;

