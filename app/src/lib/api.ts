import Constants from 'expo-constants'
import { Platform } from 'react-native'

import type { HighlighterName } from '@/theme/tokens'

/* -------------------------------------------------------------------------- */
/* Types - these mirror the shapes returned by the Express API                 */
/* -------------------------------------------------------------------------- */

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'rating'
  | 'scale'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: 'short answer',
  long_text: 'long answer',
  single_choice: 'pick one',
  multi_choice: 'pick any',
  rating: 'star rating',
  scale: 'scale',
}

export const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]

export type QuestionOption = { id: string; label: string }

/**
 * The shape the *client* sends: a brand new question or option has no id yet -
 * the server assigns those. This is deliberately separate from `Question` so
 * the two directions of the API are not forced into one type.
 */
export type QuestionOptionInput = { id?: string; label: string }

export type QuestionInput = {
  id?: string
  type: QuestionType
  label: string
  helpText?: string
  required?: boolean
  options?: QuestionOptionInput[]
  min?: number
  max?: number
}

export type Question = {
  id: string
  type: QuestionType
  label: string
  helpText?: string
  required: boolean
  options: QuestionOption[]
  min?: number | null
  max?: number | null
}

export type Audience = 'everyone' | 'matching'

export type Targeting = {
  audience: Audience
  minAge?: number | null
  maxAge?: number | null
  cities: string[]
  interests: string[]
}

export type SurveyStatus = 'draft' | 'published' | 'closed'

export type Survey = {
  id: string
  owner: string
  ownerName?: string | null
  title: string
  description: string
  slug: string
  status: SurveyStatus
  accent: HighlighterName
  questions: Question[]
  targeting: Targeting
  publishedAt: string | null
  createdAt: string
  responseCount?: number
  lastResponseAt?: string | null
}

export type UserProfile = {
  age?: number | null
  city?: string | null
  occupation?: string | null
  interests: string[]
}

export type User = {
  id: string
  name: string
  email: string
  profile: UserProfile
  createdAt: string
}

/** An answer as submitted: a string, a number, or a list of option ids. */
export type AnswerValue = string | number | string[]

export type AnswerInput = { questionId: string; value: AnswerValue }

/* ------------------------------- results ---------------------------------- */

export type ChoiceBreakdown = { id: string; label: string; count: number; percent: number }

export type QuestionSummary =
  | {
      questionId: string
      type: 'short_text' | 'long_text'
      label: string
      answered: number
      texts: { value: string; submittedAt: string }[]
      truncated: boolean
    }
  | {
      questionId: string
      type: 'single_choice' | 'multi_choice'
      label: string
      answered: number
      options: ChoiceBreakdown[]
    }
  | {
      questionId: string
      type: 'rating' | 'scale'
      label: string
      answered: number
      average: number | null
      min: number
      max: number
      distribution: { value: number; count: number }[]
    }

export type SurveyResults = {
  totalResponses: number
  firstResponseAt: string | null
  lastResponseAt: string | null
  timeline: { date: string; count: number }[]
  summary: QuestionSummary[]
}

export type PublicSurveyView = {
  survey: Survey
  isOwner: boolean
  alreadyAnswered: boolean
  answeredAt: string | null
  acceptsResponses: boolean
}

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Where is the API?
 *
 * On a phone running the app through Expo, `localhost` is the phone itself, so
 * the host of the Expo dev server is reused with the API port. Override with
 * EXPO_PUBLIC_API_URL when the API lives somewhere else (a deployed URL).
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const hostUri = Constants.expoConfig?.hostUri ?? ''
  const host = hostUri.split(':')[0]
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:4000`
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000'
}

export const API_BASE_URL = resolveBaseUrl()

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  /** Field-level messages, when the API sent a list of them. */
  get fieldErrors(): { field: string; message: string }[] {
    if (!Array.isArray(this.details)) return []
    return this.details.filter(
      (entry): entry is { field: string; message: string } =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as { message?: unknown }).message === 'string',
    )
  }
}

let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Send without an Authorization header, even when a token is held. */
  anonymous?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false } = options

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(!anonymous && authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      0,
      `Could not reach the API at ${API_BASE_URL}. Is the server running?`,
    )
  }

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Request failed with status ${response.status}`
    const details = (payload as { details?: unknown } | null)?.details
    throw new ApiError(response.status, message, details)
  }

  return payload as T
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                   */
/* -------------------------------------------------------------------------- */

export const api = {
  auth: {
    register: (input: {
      name: string
      email: string
      password: string
      profile?: Partial<UserProfile>
    }) => request<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: input }),

    login: (input: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: input }),

    me: () => request<{ user: User }>('/api/auth/me'),
  },

  users: {
    updateMe: (input: { name?: string; profile?: Partial<UserProfile> }) =>
      request<{ user: User }>('/api/users/me', { method: 'PATCH', body: input }),
  },

  surveys: {
    list: () => request<{ surveys: Survey[] }>('/api/surveys'),

    create: (input: {
      title: string
      description?: string
      accent?: HighlighterName
      questions?: QuestionInput[]
      targeting?: Partial<Targeting>
    }) => request<{ survey: Survey }>('/api/surveys', { method: 'POST', body: input }),

    get: (id: string) => request<{ survey: Survey }>(`/api/surveys/${id}`),

    update: (id: string, input: Partial<{
      title: string
      description: string
      accent: HighlighterName
      questions: QuestionInput[]
      targeting: Partial<Targeting>
    }>) => request<{ survey: Survey }>(`/api/surveys/${id}`, { method: 'PATCH', body: input }),

    publish: (id: string) => request<{ survey: Survey }>(`/api/surveys/${id}/publish`, { method: 'POST' }),

    close: (id: string) => request<{ survey: Survey }>(`/api/surveys/${id}/close`, { method: 'POST' }),

    remove: (id: string) => request<{ deleted: boolean }>(`/api/surveys/${id}`, { method: 'DELETE' }),

    results: (id: string) => request<{ survey: Survey; results: SurveyResults }>(`/api/surveys/${id}/results`),
  },

  feed: {
    list: (search?: string) =>
      request<{ surveys: Survey[]; matchedCount: number }>(
        `/api/feed${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),

    answered: () =>
      request<{
        responses: {
          id: string
          submittedAt: string
          answerCount: number
          survey: { id: string; title: string; slug: string; status: SurveyStatus }
        }[]
      }>('/api/feed/answered'),
  },

  public: {
    survey: (slug: string) => request<PublicSurveyView>(`/api/public/surveys/${slug}`, { anonymous: true }),

    submit: (slug: string, answers: AnswerInput[]) =>
      request<{ response: { id: string; survey: string; submittedAt: string } }>(
        `/api/public/surveys/${slug}/responses`,
        { method: 'POST', body: { answers } },
      ),
  },
}

/** Human-readable message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something unexpected happened'
}
