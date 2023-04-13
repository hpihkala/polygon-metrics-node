import { StreamrClient, StreamPermission } from 'streamr-client'

const privateKey = process.env.PRIVATE_KEY
if (!privateKey) {
	console.error('Set the private key with share permissions into env variable PRIVATE_KEY')
	process.exit(1)
}

const validatorAddress = process.env.VALIDATOR_ADDRESS
if (!validatorAddress) {
	console.error('Set the validator address into env variable VALIDATOR_ADDRESS')
	process.exit(1)
}

const streamr = new StreamrClient({
	auth: {
		privateKey,
	}
})

const streams = [
	'polygon-validators.eth/validator/heimdall',
	'polygon-validators.eth/validator/bor',
	'polygon-validators.eth/sentry/bor',
	'polygon-validators.eth/sentry/heimdall',
]

;(async () => {
	const myAddress = await streamr.getAddress()

	// Grant and revoke stream permissions
	for (const streamId of streams) {
		console.log(`Setting permissions for ${streamId}`)
		await streamr.setPermissions(
			{
				streamId,
				assignments: [
					{
						user: validatorAddress,
						permissions: [StreamPermission.PUBLISH],
					},
				],
			},
		)
	}
})()
