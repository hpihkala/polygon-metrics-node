# Polygon Metrics Node

This software is intended to be run by Polygon PoS validators to share health metrics of their nodes. This enables the Polygon community to build early warning systems, dashboards, and other tooling to benefit both the validators themselves as well as the broader audience by increasing transparency. There are currently a bit over 100 validators in the Polygon PoS network.

Polygon PoS validators run two types of nodes to validate the chain: Bor and Heimdall. Both ship with a HTTP API that outputs health metrics in Prometheus format. Additionally, the setup includes two different machines set up in a similar way: a Sentry machine and the actual Validator machine. In total there are 4 such metrics endpoints (Bor and Heimdall on both Sentry and Validator).

The Metrics node periodically calls those endpoints, formats the metrics to a more readable JSON format, and publishes the metrics over the decentralized [Streamr protocol](https://streamr.network). The result is a firehose of health metrics from the validators, which anyone can subscribe to and build on.

The idea of the Metrics node is introduced in this [Polygon governance proposal draft](https://forum.polygon.technology/t/proposal-decentralized-sharing-of-validator-health-metrics/11454/6).

## Installing the Metrics node

The Metrics node is available as a [Docker image](https://hub.docker.com/r/hpihkala/polygon-metrics-node) to make it easy to download and run regardless of platform, or to plug into orchestration frameworks like Kubernetes. These step-by-step instructions are for trying out the image using the `docker` command line tool, but if you use Kubernetes or a hosted cloud platform for Docker containers, then please refer to their respective documentation on how to run Docker containers.

1. Check that the Prometheus API is enabled on both Bor and Heimdall, on both Validator and Sentry machines:
	- Heimdall: in your `config.toml` (usually located at `/var/lib/heimdall/config/config.toml`), you need to have `prometheus = true`. (See [Polygon docs](https://wiki.polygon.technology/docs/maintain/validate/run-validator-ansible/#configure-the-heimdall-service-1))
	- Bor: it's on by default, but you can check your `config.toml` (usually located at `/var/lib/bor/config.toml`) in which you need to have [this](https://github.com/maticnetwork/launch/blob/master/mainnet-v1/sentry/sentry/bor/config.toml#L95-L96).
1. Configure the firewall on Validator and Sentry machines to accept connections to ports `26660` and `7071` from the Metrics node machine
1. Create a new Ethereum address and private key using your wallet/tool of choice ([MetaMask](https://metamask.io/), [Vanity address generator](https://vanity-eth.tk/), etc.)
1. Send the above Ethereum address (NOT the private key!) to the onboarding person for the Metrics network (currently ping `@henri#1016` on `#pos-discussion` on Polygon Discord)
1. [Install Docker](https://docs.docker.com/get-docker/) if you don't have it
1. Use the `docker` command-line tool to download and start the image:

```
docker run hpihkala/polygon-metrics-node
```

The above command should try to start it, and exit with the following error:

```
Error: The following env variables are required: 
METRICS_PRIVATE_KEY
VALIDATOR_NAME
```

That's a very good sign! The program started successfully but quit because you didn't supply any configuration via environment variables. Let's do that now!

- Create a file called `env.list`
- Paste the following template into that file and fill the values according to your setup, replacing the "XXX" with your actual values:

```
# Your Metrics private key. The corresponding address must be whitelisted to publish on the metrics streams.
METRICS_PRIVATE_KEY=XXX

# The name of your validator node as shown in the Polygon Staking UI: https://staking.polygon.technology
VALIDATOR_NAME=XXX

# URL to the Prometheus endpoint on your Validator Heimdall
VALIDATOR_HEIMDALL=http://XXX:26660/metrics

# URL to the Prometheus endpoint on your Validator Bor
VALIDATOR_BOR=http://XXX:7071/debug/metrics/prometheus

# URL to the Prometheus endpoint on your Validator Heimdall
SENTRY_HEIMDALL=http://XXX:26660/metrics

# URL to the Prometheus endpoint on your Validator Bor
SENTRY_BOR=http://XXX:7071/debug/metrics/prometheus

# Optional: How often to read and publish the metrics, in seconds. Default: `60` seconds
# POLL_INTERVAL_SECONDS=60

# Optional: How soon to timeout if the endpoint doesn't respond. Default: `10` seconds
# REQUEST_TIMEOUT_SECONDS=10
```

- Save your changes to the file.
- Test your config with:

```
docker run --env-file env.list hpihkala/polygon-metrics-node --test-config
```

- If there's an error, see the [Troubleshooting](#troubleshooting) section below for help.
- If the above run ends successfully with `Everything seems fine!`, you're good to go. Start the Metrics node in the background (`-d`) with:

```
docker run -d --env-file env.list hpihkala/polygon-metrics-node
```

To view the log for troubleshooting, use `docker ps` to find the ID of the container, and then `docker logs -f [ID]` to see the logs.

For further information about running, stopping, and updating containers see the [Docker docs](https://docs.docker.com/language/nodejs/run-containers/).

## Updating the Metrics node image

- Pull the newest image with `docker pull hpihkala/polygon-metrics-node`
- Use `docker ps` to find the ID of the currently running container
- `docker kill [ID]`
- Restart using the usual start command `docker run -d --env-file env.list hpihkala/polygon-metrics-node`

## Troubleshooting

```
Error: Your address 0x... does not have permission to publish to polygon-validators.eth/...!
```

- Get in touch with the onboarding person for the Metrics network (currently ping `@henri#1016` on `#pos-discussion` on Polygon Discord)

```
Error: Couldn't successfully retrieve metrics for [node] from [url].
```

- Check that the given URL points to the right machine
- Check your firewall settings on that machine: the Prometheus metrics API ports (by default `26660` and `7071`) must be allowed from the Metrics machine
- Check that the Prometheus metrics API is enabled on Bor and Heimdall (see the first step in the installation instructions above)

## Subscribing to the data

The data is being published to the following four stream ids, one per each node type:

- `polygon-validators.eth/validator/bor` ([preview in browser](https://streamr.network/core/streams/polygon-validators.eth%2Fvalidator%2Fbor/preview))
- `polygon-validators.eth/validator/heimdall` ([preview in browser](https://streamr.network/core/streams/polygon-validators.eth%2Fvalidator%2Fheimdall/preview))
- `polygon-validators.eth/sentry/bor` ([preview in browser](https://streamr.network/core/streams/polygon-validators.eth%2Fsentry%2Fbor/preview))
- `polygon-validators.eth/sentry/heimdall` ([preview in browser](https://streamr.network/core/streams/polygon-validators.eth%2Fsentry%2Fheimdall/preview))

Builders seeking to use the data can easily subscribe to the above streams using one of the following:
- [JS client library](https://www.npmjs.com/package/streamr-client)
- [Broker node](https://docs.streamr.network/node-runners/run-a-node)
- [Command-line interface (CLI)](https://docs.streamr.network/usage/cli-tool/)

Example using the CLI tool:

```
streamr stream subscribe polygon-validators.eth/sentry/heimdall
```

## Data format and content

Examples of the data format and content can be found here:
- [Bor](exampledata/bor.json)
- [Heimdall](exampledata/heimdall.json)

You can of course also subscribe to the streams to see current metrics content published by validators.

The metric types `GAUGE`, `COUNTER`, `SUMMARY`, and `HISTOGRAM` and corresponding values are as defined in [Prometheus docs](https://prometheus.io/docs/concepts/metric_types/).

