
import { SplitFactory, type IClient } from '@splitsoftware/splitio';
import 'dotenv/config';

let splitClient: IClient | null = null;
let splitFactory: SplitIO.ISDK | null = null;

const sdkKey = process.env.SPLIT_SDK_KEY;

/**
 * Initializes the Split.io client.
 * This should be called once when the application starts.
 */
export function initializeFeatureFlagService() {
  if (splitClient) {
    console.log('[Split.io] Service already initialized.');
    return;
  }

  if (!sdkKey || sdkKey === 'YOUR_SPLIT_SDK_KEY') {
    console.warn('[Split.io] SDK key is not configured. Feature flags will use default values.');
    return;
  }

  splitFactory = SplitFactory({
    core: {
      authorizationKey: sdkKey,
    },
    // For production, you might want to adjust log levels
    debug: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'WARN',
  });

  splitClient = splitFactory.client();

  splitClient.on(splitClient.Event.SDK_READY, () => {
    console.log('[Split.io] SDK is ready.');
  });

  splitClient.on(splitClient.Event.SDK_UPDATE, () => {
    console.log('[Split.io] SDK has been updated.');
  });

  splitClient.on(splitClient.Event.SDK_READY_TIMED_OUT, () => {
    console.warn('[Split.io] SDK timed out.');
  });
}

/**
 * Gets the treatment (e.g., 'on' or 'off') for a given feature flag.
 *
 * @param featureFlagName The name of the feature flag (split) to evaluate.
 * @param key The user or tenant key to evaluate against. Defaults to 'anonymous'.
 * @param attributes Optional attributes for more complex targeting rules.
 * @returns The treatment string ('on', 'off', etc.). Returns 'off' if the SDK is not ready.
 */
export function getTreatment(
    featureFlagName: string, 
    key: string = 'anonymous', 
    attributes?: SplitIO.Attributes
): string {
  if (!splitClient) {
    // If the SDK is not initialized (e.g., missing key), default to a safe 'off' state.
    return 'off';
  }
  return splitClient.getTreatment(key, featureFlagName, attributes);
}

/**
 * A convenience function to check if a feature flag is 'on'.
 *
 * @param featureFlagName The name of the feature flag (split).
 * @param key The user or tenant key.
 * @param attributes Optional attributes.
 * @returns `true` if the treatment is 'on', `false` otherwise.
 */
export function getFeatureFlag(
    featureFlagName: string, 
    key: string = 'anonymous', 
    attributes?: SplitIO.Attributes
): boolean {
  return getTreatment(featureFlagName, key, attributes) === 'on';
}

/**
 * Gracefully shuts down the Split.io client.
 * This should be called when the application is shutting down.
 */
export async function destroyFeatureFlagService() {
  if (splitClient) {
    await splitClient.destroy();
    splitClient = null;
    splitFactory = null;
    console.log('[Split.io] Service destroyed.');
  }
}
