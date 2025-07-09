# serilogger

A structured logging framework for JavaScript, inspired by [Serilog](http://serilog.net/).

[![npm](https://img.shields.io/npm/v/serilogger.svg)](https://www.npmjs.com/package/serilogger)
[![Build Status](https://travis-ci.org/davisb10/serilogger.svg?branch=master)](https://travis-ci.org/davisb10/serilogger)
[![Coverage Status](https://coveralls.io/repos/github/davisb10/serilogger/badge.svg?branch=master)](https://coveralls.io/github/davisb10/serilogger?branch=master)

_Note: Originally forked from the structured-log project_

## Basic Example

```js
// ES6 Style
import { LoggerConfiguration, ConsoleSink } from 'serilogger';

const logger = new LoggerConfiguration()
                    .writeTo(new ConsoleSink())
                    .create();

logger.info('Hello {Name}!', 'Greg');

// Pre-ES6 Style
var serilogger = require('serilogger');

var logger = serilogger.configure()
                       .writeTo(new serilogger.ConsoleSink())
                       .create();

logger.info('Hello {Name}!', 'Greg');
```

The above code will print the following to the console:

```plain
[Information] Hello Greg!
```

## Installation

**serilogger** is distributed through [npm](https://www.npmjs.com/package/serilogger). Run the following:

```Bash
npm i --save serilogger
```

## Configuration

Configuring **serilogger** is a straightforward process, going through three steps.
First, we initialize a new logging pipeline configuration by instantiating a `LoggerConfiguration`:

```js
const logger = new LoggerConfiguration()
```

The second step is the main step. Configuration of different
filters and targets is done by chaining methods together in a fluent syntax.
Events flow through the pipeline from top to bottom, so new filters and
enrichers can be inserted between the different sinks to build a highly
controllable pipeline.

```js
  .writeTo(new ConsoleSink())
  .minLevel.warning()
  .writeTo(new OtherExampleSink({ url: 'http://example.com' }))
  .writeTo(...)
```

The chain is closed by calling `create()`, which instantiates a new logger
instance based on the pipeline configuration.

```js
  .create();

// The logger is ready for use!
logger.verbose('Hello serilogger!');
```

### Log Levels

There are 6 log levels available by default, in addition to a setting to disable logging completely.
In decreasing order of severity (with descriptions borrowed from [Seq](https://github.com/serilog/serilog/wiki/Writing-Log-Events#log-event-levels)):

|Label|Description|Bitfield|
|---|---|---|
|`off`|When the minimum level is set to this, nothing will be logged.|0|
|`fatal`|Critical errors causing complete failure of the application.|1|
|`error`|Indicates failures within the application or connected systems.|3|
|`warning`|Indicators of possible issues or service/functionality degradatio.|7|
|`information`|Events of interest or that have relevance to outside observers.|15|
|`debug`|Internal control flow and diagnostic state dumps to facilitate pinpointing of recognised problems.|31|
|`verbose`|Tracing information and debugging minutiae; generally only switched on in unusual situations.|63|

The log levels can also be represented as bitfields, and each log level also includes any levels of higher severity.
For example, `warning` will also allow events of the `error` level through, but block `information`,
`debug` and `verbose`.

A minimum level can be set anywhere in the pipeline to only allow events matching that level
level or lower to pass further through the pipeline.

The below examples will all set the minimum level to `warning`:

```js
  .minLevel.warning()
// or
  .minLevel(7)
// or
  .minLevel('warning')
```

There is no minimum level set by default, but a common choice is `Information`. Note that if a restrictive level is set
early in the pipeline, and a more permissive level is set further down, the events that are filtered out by the more
restrictive level will never reach the more permissive filter.

The Logger object contains shorthand methods for logging to each level.

```js
logger.fatal('Application startup failed due to a missing configuration file');
logger.error('Could not parse response message');
logger.warn('Execution time of {time} exceeded budget of {budget}ms', actualTime, budgetTime);
logger.info('Started a new session');
logger.debug('Accept-Encoding header value: {acceptEncoding}', response.acceptEncoding);
logger.verbose('Exiting getUsers()');
```

You can also pass an error object as the first argument to any of the logging methods, which will pass it along with
the event and allow it to be processed by the pipeline:

```js
try {
  // something that fails here
 } catch (error) {
   logger.error(error, error.message);
 }
```

#### Dynamically controlling the minimum level

You can also control the minimum level dynamically using the `DynamicLevelSwitch` class.
Pass an instance to the `minLevel()` function:

```js
const dynamicLevelSwitch = new DynamicLevelSwitch();

// ...

  .minLevel(dynamicLevelSwitch)
```

You can then call the same shorthand methods as those present on the `minLevel` object (`error()`, `debug()` etc.) to
dynamically change the minimum level for the subsequent stages in the pipeline.

```js
logger.debug('This message will be logged');
dynamicLevelSwitch.warning();
logger.debug('This message won\'t');
```

### Sinks

A *sink* is a recipient for log events going through the pipeline, and is generally used to publish events to some
external source such as the developer console, file system or an online service.

To add a sink as a target for log events in the pipeline, pass an instance to the `writeTo()` function.

```js
  .writeTo(new ExampleSink())
```

The `Logger` object that's created with the `create()` method is also a valid sink,
so you can pass it to another pipeline.

```js
const logger1 = new LoggerConfiguration()
  // ...
  .create();

const logger2 = new LoggerConfiguration()
  .writeTo(logger1)
  .create();
```

#### Built-in sinks

|Name|Description|
|---|---|
|[BatchedSink](#batched-sink)|Outputs events periodically and/or by batch size.|
|[ConsoleSink](#console-sink)|Outputs events through the `console` object in Node or the browser.|
|[ColoredConsoleSink](#colored-console-sink)|Outputs the same as **ConsoleSink** but with **Colors**.|
|[ApiSink](#api-sink)|Outputs events to a custom API|
|[SeqSink](#seq-sink)|Outputs events to a Seq server (extends ApiSink)|
|[FileSink](#file-sink)|Outputs events to a rolling file|

### Filtering

You can *filter* which events are passed through the pipeline using the `filter()` function. It takes
a single function parameter that will be used to test events going into the filter, and if it returns `true`,
the events will be allowed to continue through the pipeline.

The below example will filter out any log events with template properties, only
allowing pure text events through to the next pipeline stage.

```js
  .filter(logEvent => logEvent.properties.length === 0)
```

The predicate should take a log event as its only parameter, and return true or false.

### Enrichment

Log events going through the pipeline can be *enriched* with additional properties
by using the `enrich()` function.

```js
  .enrich({
    'version': 2,
    'source': 'Client Application'
  })
```

You can also pass a function as the first argument, and return an object with the properties to enrich with.
This can be useful to dynamically add properties based on the current context or state of the application.

```js
const state = {
  user: null
};

// ...

  .enrich(() => ({ user: state.user.name }))
```

The enricher function will receive a copy of the event properties as its first argument, so that you can conditionally mask
sensitive information from the event. This can be useful when you want to log detailed information in your local console, but not to external sinks further down the pipeline.

```js
logger.info('Incorrect client secret: {Secret}', secret);

// ...

  .enrich((properties) => {
    if (properties.secret) {
      return {
        secret: 'MASKED'
      };
    }
  })
```

> The `properties` argument is a deep clone of the event properties, and cannot be used to manipulate the source object directly (e.g. `delete properties.secret`).

### Errors

Errors in the logger are suppressed by default. To disable suppression, and allow errors to be propagated to
the environment, use the `suppressErrors()` function to set suppression to `false`.

```js
  .suppressErrors(false)
```

This setting is global for the pipeline, so if it is called multiple times in the configuration chain, the value of
the last call will be used.

> Only errors throw in the logging pipeline will be suppressed.
> Errors that occur during configuration will always propagate.

### Console Sink

The `ConsoleSink`, which outputs event to the Node.js or browser console, is provided by default.
The following line creates a new instance that can be passed to the logger configuration:

```js
var consoleSink = new ConsoleSink({ /* options */ });
```

The `options` object is optional, but can be used to modify the functionality of the sink.
It supports the following properties:

|Key|Description|Default|
|---|---|---|
|`console`|An object with a console interface (providing `log()`, `info()`, etc.) that will be used by the sink when writing output.|`console` global|
|`includeProperties`|If `true`, the properties of the log event will be written to the console in addition to the message.|`false`|
|`includeTimestamps`|If `true`, timestamps will be included in the message that is written to the console.|`false`|
|`removeLogLevelPrefix`| If `true`, the prefix (e.g. [Information]) will not be included in the message|`false`|
|`restrictedToMinimumLevel`|If set, only events of the specified level or higher will be output to the console.|`undefined`|

### Colored Console Sink

The `ColoredConsoleSink`, has the same configuration as the regular [ConsoleSink](#console-sink).

```js
var coloredConsoleSink = new ColoredConsoleSink({ /* options */ });
```

### Batched Sink

The `BatchedSink` allows for batching events periodically and/or by batch size.

It can either be used as a wrapper around existing sinks:

```js
var batchedSink = new BatchedSink(new ConsoleSink(), { /* options */ });
```

Or, if developing a sink and using ES6 or TypeScript, you can use it as a base class to add batching capabilities:

```js
class MySink extends BatchedSink {
  constructor() {
    super(null, { /* options */ });
  }

  // Override emitCore and/or flushCore to add your own sink's behavior

  emitCore(events) {
    // ...
  }

  flushCore() {
    // ...

    return Promise.resolve();
    // If you don't return a promise,
    // a resolved promise will be returned for you
  }
}
```

The `options` object is optional, but can be used to modify the batching thresholds or add durability to the sink.
It supports the following properties:

|Key|Description|Default|
|---|---|---|
|`durableStore`|An instance implementing the [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) interface (such as `localStorage` in the browser, or [node-localstorage](https://github.com/lmaccherone/node-localstorage) for Node.js applications). If this is set, it will be used as an intermediate store for events until they have been successfully flushed through the pipeline.|`null`|
|`maxSize`|The maximum number of events in a single batch. The sink will be flushed immediately when this limit is hit.|`100`|
|`period`|The interval for autmoatic flushing of batches, in seconds.|`10`|

### Api Sink

The `ApiSink` outputs events to a custom POST API with the option of custom headers along with the request. It can be used like any of the other sinks.

```js
.writeTo(new ApiSink({
  url: "http://localhost:5341/api/log/custom",
  headers: { "header1": "value1" }
}))
```

The `options` parameter is required, however the only required property is the `url`.
It supports the following properties:

|Key|Description|Required?|
|---|---|---|
|`compact`|If true, events be serialized using Serilog's compact format|&#x2717;|
|`durable`|If true, events will be buffered in local storage if available|&#x2717;|
|`levelSwitch`|DynamicLevelSwitch which the Seq log level will control and use|&#x2717;|
|`suppressErrors`|If true, errors in the pipeline will be suppressed and logged to the console instead (defaults to true)|&#x2717;|
|`url`|URL to the API|&#x2713;|
|`headers`|Any headers required to be sent with the request|&#x2717;|

Or, if you need to develop a custom sink and you are using ES6 or TypeScript, you can use it as a base class to add any custom behaviors:

```js
class MySink extends ApiSink {
  constructor() {
    // ...
    super(options: ApiSinkOptions);
    // ...
  }

  // Override postToLogger to add your own sink's behavior, and optionally toString

  public toString() {
    return 'MySink';
  }

  protected postToLogger(url: any, body: any) {
    // ...
    const promise = fetch(`${url}`, {
      // ...
    });
    return promise;
   }
}
```

### Seq Sink

The `SeqSink` outputs events to a Seq logging server. It can be used like any of the other sinks.

```js
.writeTo(new SeqSink({
  url: "http://localhost:5341",
  apiKey: "API_KEY"
}))
```

The `options` parameter is required, however the only required property is the `url`.
It supports the following properties:

|Key|Description|Required?|
|---|---|---|
|`apiKey`|API key to use|&#x2717;|
|`compact`|If true, events be serialized using Serilog's compact format|&#x2717;|
|`durable`|If true, events will be buffered in local storage if available|&#x2717;|
|`levelSwitch`|DynamicLevelSwitch which the Seq log level will control and use|&#x2717;|
|`suppressErrors`|If true, errors in the pipeline will be suppressed and logged to the console instead (defaults to true)|&#x2717;|
|`url`|URL to the Seq server|&#x2713;|

### File Sink

The `FileSink` outputs events to a rolling file. It can be used like any of the other sinks.

```js
.writeTo(new FileSink({
  fileName: 'app-logs',
  outputDir: './logs',
  maxFileSize: FileSize.ONE_MB * 10
}))
```

The `options` parameter is required. It supports the following properties:

|Key|Description|Default|
|---|---|---|
|`fileName`|The name of the file that is written in the `outputDir` folder. No extension necessary as the log file always ends with `.log`. If no file name is provided, the system will use the current date with format YYYY-MM-DD.|`undefined`|
|`outputDir`|The directory in which the log files are written|`'./logs'`|
|`maxFileSize`|The maximum file size in KB before the file rolls. By default at 10 MB.|`10_485_760`|
|`restrictedToMinimumLevel`|If set, only events of the specified level or higher will be output to the console.|`undefined`|

⚠️ The rolling system is not based on any interval. Whenever the sink is used, the system checks whether the file needs to roll or not.
If it does, it will append a number (starting at 1) to the file. The most recent file remains **without** number, and the oldest one has the smallest number.

## Child Logger Functionality

After a logger object has been created, you may want to create a clone / child logger and add some scoped enrichment properties. To do this, you can just use the .createChild() method, passing in an enrichment parameter just like the original .enrich() method.

This method copies all of the existing stages and sinks and adds the new enrichment stage to the end of the pipeline.

```js
const logger = new LoggerConfiguration()
                    .writeTo(new ConsoleSink())
                    .create();

const childLogger = logger.createChild({
    'scope': 'childLogger'
});

childLogger.info('...');
```
