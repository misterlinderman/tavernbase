import { API_BASE_URL } from '../config/api';
import type { ApiListResponse, Event } from '../types';

export async function getEvents(): Promise<Event[]> {
  const res = await fetch(`${API_BASE_URL}/events`);

  if (!res.ok) {
    throw new Error('Failed to load events');
  }

  const json: ApiListResponse<Event> = await res.json();
  return json.data;
}
