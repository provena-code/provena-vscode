Ok, let's work on configuration. Here's how I'd like that to work:
* For clarity, there are user settings, like whether Provena's active, whether to ignore file warnings, which students should be able to update (or the UI updates for them).
* There are classroom settings, like how to authenticate, where the provena server lives, client/secrets if using local authentication, etc. These can come from two different sources:
  * 1) Defaults baked into the source code itself. These should be used in the absence of a local config. This lets me make a school-specific version of the extension that students don't need to configure. These should probably come from an .env file that can be .gitignored (that's the current practice), unless you've got a better idea (e.g., json/yaml might be easier to work with if it's easy enough to import, but that also might be overkill)
  * 2) Workspace configs that can override it. For example, I might release a no-defaults extension to the marketplace that an instructor can configure by giving students a workspace template that includes preconfigured settings (in .vscode/settings.json)
* Both instructor override settings and student settings might live in settings.json, but the latter don't need to have default values from .env.
* Since the different auth methods require different info, we need a way to structure the settings/.env file and validate it having the required info.

This task concerns only the instructor-specified config values, but I've explained the student-configured values so there's no confusion. Currently, these include the following (most but not all currently read from .env):
* The server endpoint for logging
* The auth configuration, which could include:
  * ServerAuth (no additional details)
  * GoogleAuth (which needs a client ID and secret)
* Config Overridable (precomiled only): whether local settings can override the precompiled config values (I imagine this would be rare, but we should define the behavior. Probably the default here is yes -- could be helpful if the server goes down and we need to change the endpoint)

Note that auth configuration is currently a setting already, but we can't set a default in the config. So this should become uniform

Can you read relevant code, update this file with additional details and ask any question you have?