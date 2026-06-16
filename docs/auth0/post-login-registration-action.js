/**
 * Auth0 Action — Post Login / Post User Registration
 *
 * Copy into Auth0 Dashboard → Actions → Library → Build Custom
 * Trigger: Login / Post User Registration
 * Deploy and add to the Login flow after the trigger.
 *
 * Adds email, name, and email_verified to access tokens so the Tavern Base API
 * can auto-link accounts and enforce verification on paid registration.
 */
exports.onExecutePostLogin = async (event, api) => {
  if (event.user.email) {
    api.accessToken.setCustomClaim('email', event.user.email);
  }

  if (event.user.name) {
    api.accessToken.setCustomClaim('name', event.user.name);
  }

  if (typeof event.user.email_verified === 'boolean') {
    api.accessToken.setCustomClaim('email_verified', event.user.email_verified);
  }
};
