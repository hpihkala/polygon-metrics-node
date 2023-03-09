# Polygon Metrics Node

This software is intended to be run by Polygon PoS validators to share health metrics of their nodes. This enables the Polygon community to build early warning systems, dashboards, and other tooling to benefit both the validators themselves as well as the broader audience by increasing transparency. There are currently a bit over 100 validators in the Polygon PoS network.

Polygon PoS validators run two types of nodes to validate the chain: Bor and Heimdall. Both ship with a HTTP API that outputs health metrics in Prometheus format. Additionally, the setup includes two different machines set up in a similar way: a Sentry machine and the actual Validator machine. In total there are 4 such metrics endpoints (Bor and Heimdall on both Sentry and Validator).

The Metrics node periodically calls those endpoints, formats the metrics to a more readable JSON format, and publishes the metrics over the decentralized [Streamr protocol](https://streamr.network). The result is a firehose of health metrics from the validators, which anyone can subscribe to and build on.

The idea of the Metrics node is introduced in this [Polygon governance proposal draft](https://forum.polygon.technology/t/proposal-decentralized-sharing-of-validator-health-metrics/11454/6).

## Subscribing to the data

The data is being published to the following four stream ids, one per each node type:

- `polygon-validators.eth/validator/bor` ([preview in browser](https://streamr.network/core/streams/polygon-validators.eth%2Fvalidator%2Fbor/preview))
- `polygon-validators.eth/validator/heimdall` ([preview in browser](https://streamr.network/core/streams/polygon-validators.eth%2Fvalidator%2Fheimdall/preview))
- `polygon-validators.eth/sentry/bor` ([preview in browser](https://streamr.network/core/streams/polygon-validators.eth%2Fsentry%2Fbor/preview))
- `polygon-validators.eth/sentry/heimdall` ([preview in browser](https://streamr.network/core/streams/polygon-validators.eth%2Fsentry%2Fheimdall/preview))

Builders seeking to use the data can easily subscribe to the above streams using one of the following:
- [JS client library](https://www.npmjs.com/package/streamr-client),
- [Broker node](https://docs.streamr.network/node-runners/run-a-node),
- [Command-line interface (CLI)](https://docs.streamr.network/usage/cli-tool/).

Example using the CLI tool:

```
streamr stream subscribe polygon-validators.eth/sentry/heimdall
```

## Installing the Metrics node

TODO

## Configuring the Metrics node

The Metrics node is configured via environment variables, some of which are required and some are optional.

You **must** pass all of the following environment variables:

- `METRICS_PRIVATE_KEY` - Your Metrics private key. The corresponding address must be whitelisted to publish on the metrics streams.
- `VALIDATOR_ETHEREUM_ADDRESS` - Your Signer address as shown in the [Polygon Staking UI](https://staking.polygon.technology/validators/146)

Additionally, you **must** pass **one or more** of the following. Only the endpoints you specify will be read, and the others will be skipped.

- `VALIDATOR_BOR` - URL to the Prometheus port on your Validator Bor. By default `http://VALIDATOR-IP-ADDRESS:7071/debug/metrics/prometheus`
- `VALIDATOR_HEIMDALL` - URL to the Prometheus port on your Validator Heimdall. By default `http://VALIDATOR-IP-ADDRESS:26660/metrics`
- `SENTRY_BOR` - URL to the Prometheus port on your Sentry Bor. By default `http://SENTRY-IP-ADDRESS:7071/debug/metrics/prometheus`
- `SENTRY_HEIMDALL` - URL to the Prometheus port on your Validator Heimdall. By default `http://SENTRY-IP-ADDRESS:26660/metrics`

Optional configuration and corresponding default values:

- `POLL_INTERVAL_SECONDS` - How often to read and publish the metrics, in seconds. Default: `60`

## Data format and content

Examples of the data format and content can be found here:
- [Bor](exampledata/bor.json)
- [Heimdall](exampledata/heimdall.json)

You can of course also subscribe to the streams to see current metrics content published by validators.

The metric types `GAUGE`, `COUNTER`, `SUMMARY`, and `HISTOGRAM` and corresponding values are as defined in [Prometheus docs](https://prometheus.io/docs/concepts/metric_types/).

