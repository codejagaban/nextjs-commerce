import { testEnvironment } from './tests/environment.mjs'

Object.assign(process.env, testEnvironment())
