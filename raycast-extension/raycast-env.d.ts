/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Your OpenRouter API key */
  "apiKey": string,
  /** Default Model - The default model to use */
  "defaultModel": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask` command */
  export type Ask = ExtensionPreferences & {}
  /** Preferences accessible in the `conversation` command */
  export type Conversation = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ask` command */
  export type Ask = {}
  /** Arguments passed to the `conversation` command */
  export type Conversation = {}
}

