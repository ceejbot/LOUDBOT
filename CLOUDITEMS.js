const CLOUDUP = require('cloudup-client');

module.exports = function GET_THINGS_FROM_CLOUD(ID, WHO, TOKEN, SHOUTBACK)
{
	const CLIENT = CLOUDUP({ user: WHO, token: TOKEN });

	const STREAM = CLIENT.stream(ID);
	STREAM.load(() =>
	{
		STREAM.GET_THEM_ALL = DO_THE_WORK.bind(STREAM);
		STREAM.GET_THEM_ALL((INFRACTION, ITEMS) =>
		{
			if (INFRACTION) console.error(INFRACTION);
			SHOUTBACK(ITEMS || []);
		});
	});
};

function DO_THE_WORK(SHOUTBACK)
{
	const RESULTS = [];
	const SELF = this;
	let PAGE = 1;
	let TOTAL = 0;

	function DO_MORE(INFRACTION, REZ)
	{
		if (INFRACTION) return SHOUTBACK(INFRACTION, RESULTS);
		if (REZ.error) return SHOUTBACK(REZ.error, RESULTS);

		REZ.body.forEach(function(item)
		{
			RESULTS.push(item.direct_url);
		});

		if (!TOTAL) TOTAL = parseInt(REZ.header['x-total'], 10);
		if (RESULTS.length >= TOTAL)
			return SHOUTBACK(null, RESULTS);

		PAGE++;
		SELF.client.get(`/streams/${SELF.id}/items?page=${PAGE}`).end(DO_MORE);
	}

	SELF.client
		.get(`/streams/${SELF.id}/items`)
		.end(DO_MORE);
}
