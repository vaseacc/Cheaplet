import configHandler from './functions/api/config.js';
import signUploadHandler from './functions/api/sign-upload.js';
import moderateListingHandler from './functions/api/moderate-listing.js';
import verifyBotHandler from './functions/api/verify-bot.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/config') {
      return configHandler.onRequest({ request, env, ctx });
    }
    if (path === '/api/sign-upload') {
      return signUploadHandler.onRequest({ request, env, ctx });
    }
    if (path === '/api/moderate-listing') {
      return moderateListingHandler.onRequest({ request, env, ctx });
    }
    if (path === '/api/verify-bot') {
      return verifyBotHandler.onRequest({ request, env, ctx });
    }

    // Otherwise, serve static assets
    return env.ASSETS.fetch(request);
  }
};
