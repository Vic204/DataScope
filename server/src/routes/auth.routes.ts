import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { asyncHandler, HttpError } from '../lib/http.js'
import { signToken } from '../lib/jwt.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import { toPublicUser, User } from '../models/User.js'
import { loginSchema, registerSchema } from '../schemas.js'

export const authRouter = Router()

const SALT_ROUNDS = 10

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body)

    const existing = await User.findOne({ email: input.email })
    if (existing) throw HttpError.conflict('An account with that email already exists')

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      profile: {
        age: input.profile?.age,
        city: input.profile?.city,
        occupation: input.profile?.occupation,
        interests: input.profile?.interests ?? [],
      },
    })

    res.status(201).json({
      token: signToken({ sub: String(user._id), email: user.email }),
      user: toPublicUser(user),
    })
  }),
)

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body)

    const user = await User.findOne({ email: input.email }).select('+passwordHash')
    if (!user) throw HttpError.unauthorized('Email or password is incorrect')

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) throw HttpError.unauthorized('Email or password is incorrect')

    res.json({
      token: signToken({ sub: String(user._id), email: user.email }),
      user: toPublicUser(user),
    })
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: toPublicUser(currentUser(req)) })
  }),
)
