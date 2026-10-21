import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose'

/**
 * A user's profile is what survey targeting is matched against, so the fields
 * here line up with the matching rules in services/matcher.ts.
 */
const profileSchema = new Schema(
  {
    age: { type: Number, min: 10, max: 120 },
    city: { type: String, trim: true, maxlength: 80 },
    occupation: { type: String, trim: true, maxlength: 80 },
    interests: { type: [String], default: [] },
  },
  { _id: false },
)

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // select:false so it can never leak through a careless find()
    passwordHash: { type: String, required: true, select: false },
    profile: { type: profileSchema, default: () => ({}) },
  },
  { timestamps: true },
)

userSchema.index({ 'profile.city': 1 })
userSchema.index({ 'profile.interests': 1 })

export type UserProfile = InferSchemaType<typeof profileSchema>
export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>

export const User = model('User', userSchema)

export type PublicUser = {
  id: string
  name: string
  email: string
  profile: UserProfile
  createdAt: Date
}

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    profile: {
      age: user.profile?.age ?? undefined,
      city: user.profile?.city ?? undefined,
      occupation: user.profile?.occupation ?? undefined,
      interests: user.profile?.interests ?? [],
    },
    createdAt: user.createdAt,
  }
}
