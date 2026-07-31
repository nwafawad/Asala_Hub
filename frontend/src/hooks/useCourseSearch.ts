import { useState, useMemo } from 'react';
import { CachedCourse } from '@/lib/db';

export function useCourseSearch(courses: CachedCourse[]) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query && selectedCategory === 'all') return courses;

    return courses.filter(course => {
      const matchesSearch =
        !query ||
        course.title.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query) ||
        course.educatorName.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'offline' && course.isCachedOffline);

      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategory]);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredCourses,
  };
}
