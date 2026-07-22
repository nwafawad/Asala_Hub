"use client";

import React, { useState, useEffect } from "react";
import { Globe, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { useLang } from "@/lib/lang-context";
import { COPY } from "@/lib/copy";
import { api, CourseRead, ModuleSyllabusRead } from "@/lib/api";
import { getLocalCourses, getLocalSyllabus, cacheCoursesLocally, cacheSyllabusLocally } from "@/lib/offline-store";
import { SyncStatusStrip } from "@/components/shared/SyncStatusStrip";
import { ModuleList } from "./ModuleList";
import { AssignmentStaging } from "./AssignmentStaging";

export function InstitutionalStudent() {
  const { user } = useAuth();
  const { isOnline } = useConnectivity();
  const { lang, setLang, toggleLang, isRTL } = useLang();
  const t = COPY[lang];

  // Connection override for demo controls
  const [demoConn, setDemoConn] = useState<"offline" | "syncing" | "online" | null>(null);

  // Real backend data integration with offline fallback
  const [courses, setCourses] = useState<CourseRead[]>([]);
  const [activeCourse, setActiveCourse] = useState<CourseRead | null>(null);
  const [modules, setModules] = useState<ModuleSyllabusRead[]>([]);
  const [loading, setLoading] = useState(true);

  // User initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const fetchedCourses = await api.getCourses();
        if (fetchedCourses.length > 0) {
          setCourses(fetchedCourses);
          setActiveCourse(fetchedCourses[0]);
          cacheCoursesLocally(fetchedCourses);

          const courseModules = await api.getCourseModules(fetchedCourses[0].id);
          const sorted = [...courseModules].sort((a, b) => a.order_index - b.order_index);
          setModules(sorted);
          cacheSyllabusLocally(fetchedCourses[0].id, sorted);
        }
      } catch {
        // Offline fallback read from local IndexedDB
        const cachedCourses = await getLocalCourses();
        if (cachedCourses.length > 0) {
          setCourses(cachedCourses);
          setActiveCourse(cachedCourses[0]);
          const cachedModules = await getLocalSyllabus(cachedCourses[0].id);
          setModules(cachedModules);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const courseTitle = activeCourse?.title || t.course;
  const courseCode = t.courseCode;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center gap-6 p-4 sm:p-6"
      style={{ background: "#EFF2F0" }}
    >
      {/* Demo Controls Panel — matches reference mockup */}
      <div
        className="w-full max-w-sm rounded-lg border border-[#D6DCD9] bg-white px-4 py-3 text-sm"
        dir="ltr"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7A847E]">
          {COPY.en.demoPanel}
        </p>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[#3A423E] text-xs font-medium">{COPY.en.demoConn}</span>
          <div className="flex gap-1">
            {(["offline", "syncing", "online"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setDemoConn(demoConn === s ? null : s)}
                className={`rounded-md px-2 py-1 text-xs font-medium border cursor-pointer transition-colors ${
                  (demoConn === s || (demoConn === null && ((s === "online" && isOnline) || (s === "offline" && !isOnline))))
                    ? "bg-[#2F6F63] text-white border-[#2F6F63]"
                    : "bg-white text-[#3A423E] border-[#D6DCD9] hover:border-[#2F6F63]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#3A423E] text-xs font-medium">{COPY.en.demoLang}</span>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 rounded-md border border-[#D6DCD9] px-2 py-1 text-xs font-medium text-[#3A423E] hover:border-[#2F6F63] cursor-pointer"
          >
            <Globe size={13} />
            {lang === "en" ? "English → العربية" : "العربية → English"}
          </button>
        </div>
      </div>

      {/* Main Student Frame — exact mockup container design */}
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full max-w-sm rounded-[28px] border border-[#D6DCD9] bg-white shadow-sm overflow-hidden"
        style={{
          fontFamily: isRTL
            ? "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
            : "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#EDEFEC]">
          <div>
            <p className="text-[15px] font-semibold text-[#1C2321] leading-tight">
              {t.brand}
            </p>
            <p className="text-[12px] text-[#7A847E]">{t.role}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-[#E4EEEC] flex items-center justify-center text-[#1F4E45] text-[12px] font-semibold">
            {getInitials(user?.full_name)}
          </div>
        </div>

        {/* Signature element: persistent sync status strip */}
        <SyncStatusStrip overrideConn={demoConn} />

        {/* Course Header */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#2F6F63] uppercase">
            {courseCode}
          </p>
          <h1 className="text-[19px] font-semibold text-[#1C2321] leading-tight mt-0.5">
            {courseTitle}
          </h1>
        </div>

        {/* Modules Section */}
        <div className="px-4 pb-2">
          <ModuleList modules={modules} />
        </div>

        {/* Assignment / Offline Staging Section */}
        <div className="px-4 pt-3 pb-5">
          <AssignmentStaging
            assignmentId={activeCourse ? `course-${activeCourse.id}-reflection` : "m3-reflection"}
          />
        </div>
      </div>
    </div>
  );
}

export default InstitutionalStudent;
