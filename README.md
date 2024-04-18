# OpenAI Proxy

This project serves as a proxy for the OpenAI API. Using `bun` as runtime.

## Getting Started

To get started with this project, you'll need to install the necessary dependencies. You can do this by running:

```sh
bun install
```

## Development

To start the development server, run:

```sh
bun dev
```

This will start the server and watch for changes in the [`src/index.ts`]("src/index.ts") file.

## Docker Compose

This project includes a `docker-compose.yml` file for running the application in a Docker container. This can be useful for development and testing, as well as for deploying the application in a production environment.

To use Docker Compose, you'll first need to install Docker and Docker Compose on your machine. Once you've done that, you can start the application with the following command:

```sh
docker-compose up
```

This will build the Docker image for the application (if it hasn't been built already) and start a new container. The application will be accessible at `http://localhost:3000`.

## Environment Variables

This project uses environment variables for configuration. These are stored in the [`.env`](".env") file. You'll need to provide your own `API_TOKEN` in this file.

In the Docker environment, these variables are set in the `docker-compose.yml` file:

```yml
version: "3"
services:
  openai-proxy:
    build: .
    container_name: openai-proxy
    restart: always
    ports:
      - "3000:3000"
    environment:
      - API_TOKEN=sk-1234567890abcdef
      - AGENT_ROLL_INTERVAL=60000
```

Please replace `sk-1234567890abcdef` with your middleware API token. Default will be a random token each time container started if `API_TOKEN` empty.

## Code Structure

The main entry point for the application is [`src/index.ts`]("src/index.ts"). This project also includes several utility functions and classes:

- [`src/openai.ts`]("src/openai.ts"): Contains various utility functions for interacting with the OpenAI API.
- [`src/fetch.ts`]("src/fetch.ts"): Defines the `Fetcher` class for making HTTP requests.
- [`src/agent.ts`]("src/agent.ts"): Defines the `AgentManager` class for managing user agents.
- [`src/tools.ts`]("src/tools.ts"): Contains the `AppLogger` class for logging.

## Testing

Currently, this project does not have any tests defined.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the terms of the MIT license.

## Acknowledgements

Special thanks to @PawanOsman for his [wonderful project](https://github.com/PawanOsman/ChatGPT), which served as inspiration for this project.
