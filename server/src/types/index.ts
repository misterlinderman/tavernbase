// Note: Auth types are provided by express-oauth2-jwt-bearer
// No need to augment Express.Request - the library does this automatically

// Environment variables type
export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  MONGODB_URI: string;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  JWT_SECRET: string;
  CLIENT_URL?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// DTO types
export interface CreateItemDto {
  title: string;
  description?: string;
}

export interface UpdateItemDto {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  picture?: string;
}
