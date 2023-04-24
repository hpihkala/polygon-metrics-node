import { Config } from './types/ConfigTypes'

const VALIDATOR_BOR_STREAM = 'polygon-validators.eth/validator/bor'
const VALIDATOR_HEIMDALL_STREAM = 'polygon-validators.eth/validator/heimdall'
const SENTRY_BOR_STREAM = 'polygon-validators.eth/sentry/bor'
const SENTRY_HEIMDALL_STREAM = 'polygon-validators.eth/sentry/heimdall'

function parseSentryConfig(envKeyUrls: string, envKeyNames: string, configBaseName: string, streamId: string): Config[] {
	const result: Config[] = []
	const urls: string[] = process.env[envKeyUrls]?.split(',') || []

	// Use default names if not explicitly given
	const names = process.env[envKeyNames]?.split(',') || urls.map((url, index) => {
		return process.env.VALIDATOR_NAME + (urls.length > 1 ? `-${index+1}` : '')
	})

	if (urls.length !== names.length) {
		throw new Error(`Number of ${configBaseName} URLs doesn't match the number of names!\n\nURLs (${urls.length}):\n${urls.join('\n')}\n\nNames: (${names.length}):\n${names.join('\n')}\n`)
	}

	urls.forEach((url, index) => {
		result.push({
			configName: `${configBaseName} (${names[index]})`,
			nodeName: names[index],
			url,
			streamId,
		})
	})

	return result
}

export function parseEnvToConfigs(): Config[] {
	let result: Config[] = []
	
	result = result.concat(parseSentryConfig('VALIDATOR_HEIMDALL', 'VALIDATOR_HEIMDALL_NAMES', 'Validator Heimdall', VALIDATOR_HEIMDALL_STREAM))
	result = result.concat(parseSentryConfig('VALIDATOR_BOR', 'VALIDATOR_BOR_NAMES', 'Validator Bor', VALIDATOR_BOR_STREAM))
	result = result.concat(parseSentryConfig('SENTRY_HEIMDALL', 'SENTRY_HEIMDALL_NAMES', 'Sentry Heimdall', SENTRY_HEIMDALL_STREAM))
	result = result.concat(parseSentryConfig('SENTRY_BOR', 'SENTRY_BOR_NAMES', 'Sentry Bor', SENTRY_BOR_STREAM))

	return result
}