# Channel structure — archived planning note

> **This document is superseded and is not an operational source.** The previous planning draft contained outdated counts, routing examples, and alternate usernames that were not checked on Telegram. Its tables and handles have been removed so they cannot be mistaken for verified destinations.

The current registry is `backend/channels_config.py`. To view the configured listings and descriptions, regenerate the maintained outputs:

```bash
python backend/setup_channels.py --plan
python backend/setup_channels.py --kit
python backend/setup_channels.py --create-list
python backend/gen_master_list.py
```

Registry entries describe intended routing only. They do not prove that a channel exists, that a username is available, that a bot has admin permissions, or that a message will be delivered. If a configured username is unavailable, stop and verify an operator-owned replacement before updating the registry; do not guess or probe alternates.
