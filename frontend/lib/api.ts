// API client for Asala Hub backend integration.
// Note: Storing JWT in localStorage is suitable for this demo/prototype phase.
// In the future (Sprint 2/3), a more robust offline-ready authentication/token storage strategy will be designed.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let authToken: string | null = null;

// Helper to get token safely in client-side context
export const getStoredToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("asala_auth_token");
  }
  return authToken;
};

// Helper to store token safely
export const setStoredToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("asala_auth_token", token);
    } else {
      localStorage.removeItem("asala_auth_token");
    }
  }
};

export class ApiError extends Error {
  status: number;
  detail: any;

  constructor(status: number, detail: any, message?: string) {
    super(message || (typeof detail === "string" ? detail : JSON.stringify(detail)));
    this.status = status;
    this.detail = detail;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail: any = "An error occurred";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson;
    } catch {
      errorDetail = await response.text();
    }
    throw new ApiError(response.status, errorDetail);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

// Typings matching backend schemas

export type UserRole = "student" | "educator";
export type ContentType = "text" | "video";

export interface UserRead {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CourseRead {
  id: string;
  title: string;
  description: string;
  educator_id: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleRead {
  id: string;
  course_id: string;
  title: string;
  content_type: ContentType;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CourseReadWithModules extends CourseRead {
  modules: ModuleRead[];
}

export interface UserRegister {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  preferred_language?: string;
}

export interface CourseCreate {
  title: string;
  description?: string;
}

export interface CourseUpdate {
  title?: string;
  description?: string;
}

export interface ModuleCreate {
  title: string;
  content_type: ContentType;
  content: string;
  order_index: number;
}

export interface ModuleUpdate {
  title?: string;
  content_type?: ContentType;
  content?: string;
  order_index?: number;
}

export const api = {
  // Auth API
  async register(data: UserRegister): Promise<TokenResponse> {
    const res = await request<TokenResponse>("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
        preferred_language: data.preferred_language || "en",
      }),
    });
    setStoredToken(res.access_token);
    return res;
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    // Backend OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
    // with 'username' and 'password' keys
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const res = await request<TokenResponse>("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    setStoredToken(res.access_token);
    return res;
  },

  async getMe(): Promise<UserRead> {
    return request<UserRead>("/auth/me");
  },

  // Courses API
  async getCourses(): Promise<CourseRead[]> {
    return request<CourseRead[]>("/courses");
  },

  async getCourse(id: string): Promise<CourseReadWithModules> {
    return request<CourseReadWithModules>(`/courses/${id}`);
  },

  async createCourse(data: CourseCreate): Promise<CourseRead> {
    return request<CourseRead>("/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data.title,
        description: data.description || "",
      }),
    });
  },

  async updateCourse(id: string, data: CourseUpdate): Promise<CourseRead> {
    return request<CourseRead>(`/courses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  async deleteCourse(id: string): Promise<void> {
    return request<void>(`/courses/${id}`, {
      method: "DELETE",
    });
  },

  // Modules API
  async getCourseModules(courseId: string): Promise<ModuleRead[]> {
    return request<ModuleRead[]>(`/courses/${courseId}/modules`);
  },

  async createModule(courseId: string, data: ModuleCreate): Promise<ModuleRead> {
    return request<ModuleRead>(`/courses/${courseId}/modules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  async updateModule(courseId: string, moduleId: string, data: ModuleUpdate): Promise<ModuleRead> {
    return request<ModuleRead>(`/courses/${courseId}/modules/${moduleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  async deleteModule(courseId: string, moduleId: string): Promise<void> {
    return request<void>(`/courses/${courseId}/modules/${moduleId}`, {
      method: "DELETE",
    });
  },
};
