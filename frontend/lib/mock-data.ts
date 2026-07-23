import { db } from './db';

export async function seedDatabase() {
  const seeded = await db.appState.get('seeded');
  if (seeded && seeded.value === 'true') {
    return;
  }

  const courseIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  
  await db.courses.bulkAdd([
    {
      id: courseIds[0],
      title: 'Introduction to Arabic Calligraphy',
      description: 'Learn the basics of Arabic calligraphy and script.',
      educatorId: 'edu-1',
      colorIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: courseIds[1],
      title: 'History of Islamic Architecture',
      description: 'Explore the architectural wonders of the Islamic world.',
      educatorId: 'edu-2',
      colorIndex: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: courseIds[2],
      title: 'Digital Media Production',
      description: 'Master the art of creating digital content.',
      educatorId: 'edu-3',
      colorIndex: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ]);

  await db.modules.bulkAdd([
    // Course 1
    { id: crypto.randomUUID(), courseId: courseIds[0], title: 'Intro to Naskh Script', contentType: 'video', content: 'Video content here', orderIndex: 0, isCached: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[0], title: 'Tools & Materials', contentType: 'text', content: 'Text content here', orderIndex: 1, isCached: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[0], title: 'Basic Strokes', contentType: 'text', content: 'Text content here', orderIndex: 2, isCached: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[0], title: 'Letter Forms', contentType: 'text', content: 'Text content here', orderIndex: 3, isCached: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[0], title: 'Composition', contentType: 'text', content: 'Text content here', orderIndex: 4, isCached: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // Course 2
    { id: crypto.randomUUID(), courseId: courseIds[1], title: 'Early Mosques', contentType: 'video', content: 'Video content here', orderIndex: 0, isCached: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[1], title: 'The Alhambra', contentType: 'text', content: 'Text content here', orderIndex: 1, isCached: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[1], title: 'Ottoman Architecture', contentType: 'text', content: 'Text content here', orderIndex: 2, isCached: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[1], title: 'Modern Interpretations', contentType: 'text', content: 'Text content here', orderIndex: 3, isCached: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // Course 3
    { id: crypto.randomUUID(), courseId: courseIds[2], title: 'Camera Basics', contentType: 'video', content: 'Video content here', orderIndex: 0, isCached: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[2], title: 'Audio Recording', contentType: 'audio', content: 'Audio content here', orderIndex: 1, isCached: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[2], title: 'Video Editing', contentType: 'video', content: 'Video content here', orderIndex: 2, isCached: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[2], title: 'Post-Production', contentType: 'video', content: 'Video content here', orderIndex: 3, isCached: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), courseId: courseIds[2], title: 'Distribution', contentType: 'text', content: 'Text content here', orderIndex: 4, isCached: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);

  const assignmentIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

  await db.assignments.bulkAdd([
    { id: assignmentIds[0], courseId: courseIds[0], title: 'Calligraphy Practice Sheet', description: 'Submit your daily practice sheet.', dueDate: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: assignmentIds[1], courseId: courseIds[1], title: 'Architecture Analysis Essay', description: 'Write an essay analyzing early mosque architecture.', dueDate: new Date(Date.now() + 172800000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: assignmentIds[2], courseId: courseIds[2], title: 'Short Film Project', description: 'Submit your final short film project.', dueDate: new Date(Date.now() + 259200000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);

  await db.submissions.bulkAdd([
    { id: crypto.randomUUID(), assignmentId: assignmentIds[0], studentId: 'student-1', content: 'My submission content 1', submittedAt: new Date().toISOString(), syncStatus: 'synced', grade: 85, gradedBy: 'instructor', versions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), assignmentId: assignmentIds[1], studentId: 'student-1', content: 'My submission content 2', submittedAt: new Date().toISOString(), syncStatus: 'pending', grade: null, gradedBy: null, versions: [{ content: 'Old draft', savedAt: new Date(Date.now() - 3600000).toISOString() }, { content: 'New draft', savedAt: new Date().toISOString() }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), assignmentId: assignmentIds[2], studentId: 'student-1', content: 'My submission content 3', submittedAt: new Date().toISOString(), syncStatus: 'draft', grade: null, gradedBy: null, versions: [{ content: 'Initial draft', savedAt: new Date().toISOString() }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);

  for (let c = 0; c < 3; c++) {
    for (let l = 0; l < 3; l++) {
      await db.lessons.add({
        id: crypto.randomUUID(),
        courseId: courseIds[c],
        title: `Lesson ${l + 1} for Course ${c + 1}`,
        status: l === 0 ? 'published' : 'draft',
        blocks: [
          { id: crypto.randomUUID(), type: 'text', content: 'Lesson content goes here' },
          { id: crypto.randomUUID(), type: 'quiz', content: 'What is 2+2?', options: ['3', '4', '5'], correctAnswer: 1 }
        ],
        orderIndex: l,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const students = ['std-1', 'std-2', 'std-3', 'std-4'];
  const studentNames = ['Ali', 'Aisha', 'Omar', 'Fatima'];
  const grades = [];
  for (let a = 0; a < 3; a++) {
    for (let s = 0; s < 4; s++) {
      grades.push({
        id: crypto.randomUUID(),
        assignmentId: assignmentIds[a],
        studentId: students[s],
        studentName: studentNames[s],
        score: Math.floor(Math.random() * 40) + 60,
        syncStatus: (Math.random() > 0.8 ? 'conflict' : 'synced') as 'synced' | 'pending' | 'conflict',
        conflictValue: Math.random() > 0.8 ? Math.floor(Math.random() * 40) + 60 : undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  }
  await db.grades.bulkAdd(grades);

  await db.masterclasses.bulkAdd([
    { id: crypto.randomUUID(), title: 'Mastering Oud', description: 'Learn the secrets of playing the Oud.', creatorId: 'c1', creatorName: 'Tariq', creatorBio: 'Master musician', category: 'music', price: 29.99, currency: 'USD', colorIndex: 0, status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Traditional Pottery', description: 'Create beautiful traditional pottery.', creatorId: 'c2', creatorName: 'Layla', creatorBio: 'Ceramics artist', category: 'crafts', price: 24.99, currency: 'USD', colorIndex: 1, status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Ancient Trade Routes', description: 'Discover the ancient history of trade.', creatorId: 'c3', creatorName: 'Hassan', creatorBio: 'Historian', category: 'history', price: 19.99, currency: 'USD', colorIndex: 2, status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Desert Stories', description: 'Immerse in desert storytelling.', creatorId: 'c4', creatorName: 'Amira', creatorBio: 'Storyteller', category: 'storytelling', price: 14.99, currency: 'USD', colorIndex: 3, status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Geometric Patterns', description: 'Master Islamic geometric patterns.', creatorId: 'c5', creatorName: 'Zaid', creatorBio: 'Designer', category: 'crafts', price: 34.99, currency: 'USD', colorIndex: 4, status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Maqam Theory', description: 'Deep dive into Arabic Maqam theory.', creatorId: 'c6', creatorName: 'Sami', creatorBio: 'Music Theorist', category: 'music', price: 39.99, currency: 'USD', colorIndex: 5, status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);

  await db.transactions.bulkAdd([
    { id: crypto.randomUUID(), masterclassId: 'm1', masterclassTitle: 'Mastering Oud', buyerName: 'John Doe', amount: 29.99, currency: 'USD', status: 'completed', createdAt: new Date(Date.now() - 100000).toISOString() },
    { id: crypto.randomUUID(), masterclassId: 'm2', masterclassTitle: 'Traditional Pottery', buyerName: 'Jane Smith', amount: 24.99, currency: 'USD', status: 'completed', createdAt: new Date(Date.now() - 200000).toISOString() },
    { id: crypto.randomUUID(), masterclassId: 'm3', masterclassTitle: 'Ancient Trade Routes', buyerName: 'Ali Khan', amount: 19.99, currency: 'USD', status: 'pending', createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: crypto.randomUUID(), masterclassId: 'm4', masterclassTitle: 'Desert Stories', buyerName: 'Maria Garcia', amount: 14.99, currency: 'USD', status: 'completed', createdAt: new Date(Date.now() - 400000).toISOString() },
    { id: crypto.randomUUID(), masterclassId: 'm5', masterclassTitle: 'Geometric Patterns', buyerName: 'Wei Chen', amount: 34.99, currency: 'USD', status: 'refunded', createdAt: new Date(Date.now() - 500000).toISOString() },
  ]);

  await db.appState.put({ key: 'seeded', value: 'true' });
  await db.appState.put({ key: 'lastSyncTime', value: new Date().toISOString() });
}

export async function resetDatabase() {
  await db.courses.clear();
  await db.modules.clear();
  await db.assignments.clear();
  await db.submissions.clear();
  await db.lessons.clear();
  await db.grades.clear();
  await db.masterclasses.clear();
  await db.cartItems.clear();
  await db.orders.clear();
  await db.transactions.clear();
  await db.transactionLogs.clear();
  await db.appState.clear();
}

export const ADMIN_HEALTH_SERVICES = [
  { name: 'Database API', status: 'healthy', value: '12ms' },
  { name: 'Auth Service', status: 'healthy', value: '45ms' },
  { name: 'File Storage', status: 'warning', value: '85%' },
  { name: 'Sync Engine', status: 'error', value: 'Offline' },
];

export const ADMIN_ALERTS = [
  { id: '1', severity: 'error', message: 'Sync engine disconnected', timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: '2', severity: 'warning', message: 'Storage capacity nearing limit', timestamp: new Date(Date.now() - 3600000).toISOString() },
];

export const ADMIN_CONFLICTS = [
  { id: 'c1', entityType: 'Grade', affectedUser: 'student-1', description: 'Grade updated simultaneously by Educator A and Offline Sync', dateFlagged: new Date().toISOString(), status: 'pending', valueA: '85', valueB: '90' },
  { id: 'c2', entityType: 'Submission', affectedUser: 'student-2', description: 'Multiple conflicting offline edits', dateFlagged: new Date().toISOString(), status: 'resolved', valueA: 'Draft V2', valueB: 'Draft V3' },
];
