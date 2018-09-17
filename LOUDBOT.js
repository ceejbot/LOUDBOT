'use strict';

const
	DEMAND = require,
	TRUE   = true,
	FALSE  = false
	;

const
	ASSERT     = DEMAND('assert'),
	CLOUDITEMS = DEMAND('./CLOUDITEMS'),
	FLIP       = DEMAND('flip'),
	FS         = DEMAND('fs'),
	MASTODON   = DEMAND('mastodon-api'),
	PATH       = DEMAND('path'),
	SHUFFLE    = DEMAND('knuth-shuffle').knuthShuffle,
	STRIPTAGS  = DEMAND('striptags')
	;

function ROLL_D100(CHANCE)
{
	return Math.floor(Math.random() * 100) < CHANCE;
}

function LOG(MSG)
{
	console.log([(new Date()).toISOString(), MSG].join(' '));
}

const WAITING = [];
const FLIPPED = '╯°□°）╯︵ ┻━┻';

const SWEARWORDS = [
	/.*FUCK.*/i,
	/(^|\W)CUNT(\W|$)/i,
	/(^|\W)TWAT(\W|$)/i,
	/(^|\W)BALACLAVA(^|\W)/i,
];

var MALCOLMS = [];
var SOURCE_MALCOLMS = [];

const LOUDBOT = module.exports = class LOUDBOT
{
	constructor()
	{
		const THIS = this;
		THIS.LOUDS = [];
		THIS.LOAD_ALL_LOUDS();
		THIS.SAVING = FALSE;

		THIS.COUNT = 0;
		THIS.MALCOLM_INVOCATIONS = 0;

		THIS.MASTO = new MASTODON({
			api_url     : process.env.MASTO_URL + '/api/v1/',
			access_token: process.env.MASTO_TOKEN
		});
	}

	LOAD_ALL_LOUDS()
	{
		const THIS = this;

		THIS.ADD_LINES(PATH.join(__dirname, 'SEEDS'));
		THIS.ADD_LINES(PATH.join(__dirname, 'LOUDS'));
		if (process.env.STAR_FIGHTING) THIS.ADD_LINES(PATH.join(__dirname, 'STAR_FIGHTING'));
		SHUFFLE(THIS.LOUDS);

		LOG(`THERE ARE ${THIS.LOUDS.length} LOUDS TO SHOUT!`);
	}

	ADD_LINES(FILENAME)
	{
		var THIS = this, LINES = [];
		try { LINES = FS.readFileSync(FILENAME, 'UTF8').trim().split('\n'); }
		catch (IGNORED) {}

		THIS.LOUDS = THIS.LOUDS.concat(LINES);
	}

	GOGOGO()
	{
		const THIS = this;

		const MY_FEED = THIS.MASTO.stream('streaming/user');

		MY_FEED.on('message', MESSAGE => THIS.LISTENUP(MESSAGE));
		MY_FEED.on('error', INFRACTION => LOG(INFRACTION));
		LOG('THIS LOUDBOT IS NOW FULLY ARMED AND OPERATIONAL');
	}

	LISTENUP(INCOMING)
	{
		const THIS = this;

		// LOUDBOT FOLLOWS BACK AND UNFOLLOWS
		if (INCOMING.event === 'notification' && INCOMING.data.type === 'follow')
		{
			THIS.HANDLE_FOLLOWER(INCOMING);
			return;
		}

		const PROMPT = (INCOMING.event === 'update') ? INCOMING.data : INCOMING.data.status;
		if (!PROMPT) return;

		// PUBLIC LOUDIE NOTICES ALL YELLING...
		if (THIS.WAS_IT_YELLING(PROMPT)) return;

		if (THIS.FUCK_SOMETHING_UP(PROMPT)) return;

		// BUT DECLINES TO RESPOND TO CERTAIN MESSAGES IF NOT MENTIONED
		if (INCOMING.data.type !== 'mention') return;

		if (THIS.REPORT(PROMPT)) return;

		if (THIS.HANDLE_SPECIALS(PROMPT)) return;
	}

	async HANDLE_FOLLOWER(INCOMING)
	{
		const THIS = this;
		try
		{
			const RESP = await THIS.MASTO.post('follows', { uri: INCOMING.data.account.acct });
			LOG(`FOLLOWED ${INCOMING.data.account.acct}`);
		}
		catch (INFRACTION)
		{
			LOG(`ERROR FOLLOWING ${INCOMING.data.account.acct}: ${INFRACTION.message}`);
		}
	}

	FUCK_SOMETHING_UP(PROMPT)
	{
		const THIS = this;
		const MSG = PROMPT.content;

		if (MSG.match(/FUCKITY/i))
		{
			LOG('FUCKITY BYE');
			THIS.YELL(PROMPT, 'https://cldup.com/NtvUeudPtg.gif');
			return TRUE;
		}

		if (MSG.match(/MALCOLM\s+TUCKER/i))
		{
			THIS.MALCOLM_INVOCATIONS++;
			LOG('MALCOLM RUNS!');
			THIS.YELL(PROMPT, 'https://cldup.com/w_exMqXKlT.gif');
			return TRUE;
		}

		if (!MALCOLMS.length)
		{
			MALCOLMS = [].concat(SOURCE_MALCOLMS);
			SHUFFLE(MALCOLMS);
		}

		for (var I = 0; I < SWEARWORDS.length; I++)
		{
			if (MSG.match(SWEARWORDS[I]) && ROLL_D100(25))
			{
				THIS.MALCOLM_INVOCATIONS++;
				LOG(`MALCOLM HAS BEEN INVOKED ${MSG}`);
				THIS.YELL(PROMPT, MALCOLMS.pop());
				return TRUE;
			}
		}
	}

	HANDLE_SPECIALS(PROMPT)
	{
		const THIS = this;
		const MSG = PROMPT.content;
		if (!MSG) return;

		if (MSG.match(/WRETCHED.+HIVE/i) || MSG.match(/SCUM.+VILLAINY/i))
		{
			this.YELL(PROMPT, 'WE MUST BE CAUTIOUS.');
			return TRUE;
		}

		if (MSG.match(/PASSWORD/i) && ROLL_D100(10))
		{
			this.YELL(PROMPT, 'MY VOICE IS MY PASSPORT. VERIFY ME.');
			return TRUE;
		}

		if (MSG.match(/GOT\s+A\s+THEORY/i) && ROLL_D100(75))
		{
			this.YELL(PROMPT, 'I\'VE GOT A THEORY THAT IT\'S A DEMON, A DANCING DEMON-- NO, SOMETHING ISN\'T RIGHT THERE.');
			return TRUE;
		}

		if (MSG.match(/TABLEFLIP/i))
		{
			THIS.YELL(PROMPT, FLIPPED);
			return TRUE;
		}

		if (MSG.match(new RegExp(FLIPPED)))
		{
			THIS.YELL(PROMPT, 'TABLEFLIP!');
			return TRUE;
		}

		if (MSG.match(/(TABLE)?FLIP\s+\S+/i))
		{
			const MATCHES = MSG.match(/FLIP\s+(.*)/);
			const FLIPPED = MATCHES[1] ? FLIP(MATCHES[1]) : '┻━┻';
			THIS.YELL(PROMPT, `(╯°□°）╯︵ ${FLIPPED}`);
			return TRUE;
		}
	}

	REMEMBER(LOUD)
	{
		const THIS = this;
		WAITING.push(LOUD);
		if (THIS.SAVING) return;

		THIS.SAVING = TRUE;
		FS.appendFile(PATH.join(__dirname, 'INCOMING'), WAITING.join('\n') + '\n', 'UTF8', () =>
		{
			THIS.SAVING = FALSE;
		});
		WAITING.length = 0;
	}

	WAS_IT_YELLING(PROMPT)
	{
		const THIS = this;
		const TEXT = STRIPTAGS(PROMPT.content);
		if (TEXT === TEXT.toLowerCase() || TEXT !== TEXT.toUpperCase())
			return FALSE;

		THIS.REMEMBER(TEXT);

		const LOUD = THIS.LOUDS.shift();
		if (!THIS.LOUDS.length) THIS.LOAD_ALL_LOUDS();

		if (LOUD) THIS.YELL(PROMPT, LOUD);
		else LOG('WHAT THE HELL EMPTY LOUD?');
		return TRUE;
	}

	async YELL(PROMPT, LOUD)
	{
		if (!LOUD) return;
		const THIS = this;

		const TOOT = {
			in_reply_to_id: PROMPT.id,
			visibility: PROMPT.visibility,
			status: `@${PROMPT.account.acct} ${LOUD}`
		};

		try
		{
			const RESPONSE = await THIS.MASTO.post('statuses', TOOT);
			LOG(`I YELLED : ${RESPONSE.data.url} BECAUSE: ${PROMPT.content}`);
			LOG(RESPONSE.data.content);
			THIS.COUNT++;
		}
		catch (INFRACTION)
		{
			LOG(INFRACTION.message);
		}
	}

	REPORT(PROMPT)
	{
		if (!PROMPT.content.match(/LOUDBOT:?\s+REPORT/))
			return;

		const THIS = this;
		var LOUD = 'I HAVE YELLED ' + (THIS.COUNT === 1 ? 'ONCE.' : `${THIS.COUNT} TIMES.`);
		LOUD += ` I HAVE ${THIS.LOUDS.length} UNIQUE THINGS TO SAY.`;
		if (THIS.MALCOLM_INVOCATIONS === 1)
			LOUD += 'THE WRATH OF TUCKER HAS BEEN INVOKED ONLY ONCE.';
		else if (THIS.MALCOLM_INVOCATIONS === 0)
			LOUD += ' MALCOLM HAS NEVER BEEN SUMMONED. PEOPLE ARE NOT SWEARING!';
		else
			LOUD += ` THE WRATH OF TUCKER HAS BEEN INVOKED ${THIS.MALCOLM_INVOCATIONS} TIMES.`;
		THIS.YELL(PROMPT, LOUD);
		return TRUE;
	}
};

if (require.main === module)
{
	DEMAND('dotenv').config({silent: TRUE});
	ASSERT(process.env.MASTO_URL, 'YOU MUST PROVIDE A MASTODON INSTANCE URI IN THE ENVIRONMENT VARIABLE MASTO_URL.');
	ASSERT(process.env.MASTO_TOKEN, 'YOU MUST PROVIDE A MASTONDON API TOKEN IN THE ENVIRONMENT VARIABLE MASTO_TOKEN.');

	const LOUDIE = new LOUDBOT();
	LOUDIE.GOGOGO();

	// MALCOLM IMAGES ARE OPTIONAL.
	if (process.env.CLOUDUP_TOKEN)
	{
		CLOUDITEMS(process.env.CLOUDUP_STREAM, process.env.CLOUDUP_USER, process.env.CLOUDUP_TOKEN, ITAMZ =>
		{
			LOG(`I HAVE FOUND ${ITAMZ.length} IMAGES OF MALCOLM TUCKER.`);
			SOURCE_MALCOLMS = ITAMZ;
		});
	}
}
