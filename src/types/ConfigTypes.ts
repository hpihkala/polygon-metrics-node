export interface UrlAndStream {
	url: string | undefined
	streamId: string
}

export interface Config {
	[name: string]: UrlAndStream
}