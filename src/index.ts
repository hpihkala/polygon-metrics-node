import { StreamrClient } from 'streamr-client'
import axios from 'axios'
import parsePrometheusTextFormat from 'parse-prometheus-text-format'

import { MetricsMessage, Measurable, ParsedPrometheusMessage } from './types/MessageTypes'
import { Config } from './types/ConfigTypes'

// Check required env variables
const requiredEnvs = ['METRICS_PRIVATE_KEY', 'VALIDATOR_ETHEREUM_ADDRESS']
if (requiredEnvs.find(envName => process.env[envName] == null)) {
	console.error(`Error: The following env variables are required: \n${requiredEnvs.join('\n')}`)
	process.exit(1)
}

// Prometheus endpoints and streams configuration - at least one of the endpoints must be set for this script to do anything
const config: Config = {
	'Validator Bor': {
		url: process.env.VALIDATOR_BOR,
		streamId: 'polygon-validators.eth/validator/bor',
	},
	'Validator Heimdall': {
		url: process.env.VALIDATOR_HEIMDALL,
		streamId: 'polygon-validators.eth/validator/heimdall',
	},
	'Sentry Bor': {
		url: process.env.SENTRY_BOR,
		streamId: 'polygon-validators.eth/sentry/bor',
	},
	'Sentry Heimdall': {
		url: process.env.SENTRY_HEIMDALL,
		streamId: 'polygon-validators.eth/sentry/heimdall',
	},
}

// Print the active config to console to help spot any mistakes
Object.keys(config).forEach(configName => {
	const { url, streamId } = config[configName]
	if (url && streamId) {
		console.log(`[OK] ${configName} - URL: ${url}, streamId: ${streamId}`)
	} else {
		console.log(`[SKIPPING!] ${configName} - URL: ${url}, streamId: ${streamId}`)
	}
})

// If none of the endpoints are configured, error and stop
if (!Object.keys(config).find(configName => config[configName].url && config[configName].streamId)) {
	console.error(`Error: No endpoints configured! Please give the URLs to the Prometheus ports of your nodes in one or more of the following env variables: VALIDATOR_BOR, VALIDATOR_HEIMDALL, SENTRY_BOR, SENTRY_HEIMDALL`)
	process.exit(1)
}

// Default poll interval 60 seconds
const pollIntervalSeconds = process.env.POLL_INTERVAL_SECONDS ? parseInt(process.env.POLL_INTERVAL_SECONDS) : 60
const requestTimeoutSeconds = process.env.REQUEST_TIMEOUT_SECONDS ? parseInt(process.env.REQUEST_TIMEOUT_SECONDS) : 10

const streamr = new StreamrClient({
	auth: {
		privateKey: process.env.METRICS_PRIVATE_KEY || 'undefined'
	}
})

;(async () => {
	// For good measure, print the address for the configured private key
	const address = await streamr.getAddress()
	console.log(`Metrics node configured with address: ${address}`)
	console.log(`Poll interval is ${pollIntervalSeconds} seconds`)
	console.log(`Request timeout is ${requestTimeoutSeconds} seconds`)

	const poll = async () => {
		// Poll metrics data from each of the configured endpoints
		Object.keys(config).forEach(async (configName) => {
			try {
				const { url, streamId } = config[configName]
				if (url && streamId) {
					// Fetch from the Prometheus endpoint
					console.log(`${configName}: Fetching from ${url}`)					
					const response = await axios.get(url, {
						timeout: requestTimeoutSeconds * 1000,
					})

					// Parse the Prometheus text format to an object format
					const parsedPrometheusFormat: ParsedPrometheusMessage[] = parsePrometheusTextFormat(response.data)

					const message: MetricsMessage = {
						version: 1,
						validator: process.env.VALIDATOR_ETHEREUM_ADDRESS || 'undefined',
						metrics: {}
					}
					parsedPrometheusFormat.forEach((prometheusEntry) => {
						const measurable: Measurable = {
							type: prometheusEntry.type,
							metrics: prometheusEntry.metrics,
							help: prometheusEntry.help
						}
						
						// Don't include empty help messages
						if (measurable.help === '') {
							delete measurable.help
						}

						message.metrics[prometheusEntry.name] = measurable
					})

					console.log(`${configName}: Publishing to ${streamId}`)
					// console.log(JSON.stringify(message, null, 2))
					await streamr.publish(streamId, message)
				}
			} catch (err) {
				console.log(err)
			}
		})
	}

	// Set the timer and also poll immediately on start
	poll()
	setInterval(poll, pollIntervalSeconds * 1000)
})()