import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';

// Letters, numbers, dots and underscores — better-auth's own default
// validator allows underscores but not dots, so we widen it here.
const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
      bio: {
        type: 'string',
        required: false,
        input: true,
      },
      defaultMood: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
  plugins: [
    openAPI(),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
    }),
  ],
};
