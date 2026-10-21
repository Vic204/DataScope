import { Router } from 'express'
import { asyncHandler } from '../lib/http.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import { toPublicUser } from '../models/User.js'
import { updateProfileSchema } from '../schemas.js'

export const userRouter = Router()

userRouter.use(requireAuth)

/**
 * Profile updates matter here because targeting is matched against this data:
 * adding an age or an interest can unlock surveys in the feed.
 */
userRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body)
    const user = currentUser(req)

    if (input.name) user.name = input.name

    if (input.profile) {
      const profile = user.profile ?? {}
      if (input.profile.age !== undefined) {
        if (input.profile.age === null) delete profile.age
        else profile.age = input.profile.age
      }
      if (input.profile.city !== undefined) {
        if (!input.profile.city?.trim()) delete profile.city
        else profile.city = input.profile.city
      }
      if (input.profile.occupation !== undefined) {
        if (!input.profile.occupation?.trim()) delete profile.occupation
        else profile.occupation = input.profile.occupation
      }
      if (input.profile.interests !== undefined) {
        profile.interests = [...new Set(input.profile.interests)]
      }
      user.profile = profile
    }

    await user.save()
    res.json({ user: toPublicUser(user) })
  }),
)
