import { Hono } from 'hono'
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const client = new Client({
	hostname: "localhost",
	port: 5432,
	user: "postgres",  // default PostgreSQL user
	password: "example",
	database: "postgres",  // your database name
});

try {
	await client.connect();
} catch (e) {
	if (e instanceof Deno.errors.ConnectionRefused) {
		console.error(e.message);
	}
}

const app = new Hono()

app.get('/adminpage', async c => {
	const decoder = new TextDecoder("utf-8");
	const data = await Deno.readFile("./frontend/admin.html");
	return c.html(decoder.decode(data))
})

app.get('/survey/:survey-id', async (c) => {
	const decoder = new TextDecoder("utf-8");
	const data = await Deno.readFile("./frontend/frontend.html");
	return c.html(decoder.decode(data))
})

app.get('/survey/:survey-id/feedback', async (c) => {
	// Connect to DB to get the feedbacks
	const id = c.req.param('survey-id')
	const query = `
	select * from feedback where survey_id = $1`;

	try {
		const fb = await client.queryArray({
			text: String.raw`${query}`,
			args: [id]
		});

		return c.json(fb.rows);
	} catch (error) {
		return console.error(error);
	}
})

app.get('/business/:business-id/feedback', async (c) => {
	// Connect to DB to get the feedbacks
	const id = c.req.param('business-id')
	const query = `
	select * from feedback f join survey s on f.survey_id = s.id where s.business_id = $1`;

	try {
		const fb = await client.queryArray({
			text: String.raw`${query}`,
			args: [id]
		});

		return c.json(fb.rows);
	} catch (error) {
		return console.error(error);
	}
})

app.post('/nfcsjob', async c => {
	// get latest survey of business
	const business_id = await c.req.text();

	const query = `
	select id from survey where business_id = $1 order by created_at desc limit 1;`

	try {
		const ids = await client.queryArray({
			text: String.raw`${query}`,
			args: [business_id]
		});

		return c.json({
			"survey_link": `survey/${ids.rows[0][0]}`
		});
	} catch (error) {
		return c.json({
			"survey_link": `${error}`
		});
	}
})

app.post('/survey/:survey-id/feedback', async (c) => {
	// Connect to DB to create the feedback

	const feedbackID = crypto.randomUUID();
	const payload: JSON[] = await c.req.json();
	const surveyID = c.req.param('survey-id');

	const query = `
	INSERT INTO feedback (id, survey_id, payload, created_at, updated_at)
	VALUES ($1, $2, $3, NOW(), NOW());`;

	try {
		await client.queryArray({
			text: String.raw`${query}`,
			args: [feedbackID, surveyID, payload]
		});
	} catch (error) {
		console.error(error);
		return c.text(`error: "Internal Server Error"`);
	}
});

app.post('/surveyCreate', async (c) => {
	// Connect to DB to create the survey
	const id = crypto.randomUUID();
	const payload: { business_id: string, questions: JSON[] } = await c.req.json()

	const query = `
	INSERT INTO survey (id, business_id, created_at, updated_at, questions)
	VALUES ($1, $2, NOW(), NOW(), $3);`;

	try {
		await client.queryArray({
			text: String.raw`${query}`,
			args: [id, payload.business_id, payload.questions]
		});

		return c.text(`Survey created successfully`);
	} catch (error) {
		console.error(error);
		return c.text(`error: "Internal Server Error"`);
	}
})

app.post('/businessCreate', async (c) => {
	const id = crypto.randomUUID();
	const name = await c.req.text()

	const query = `
	INSERT INTO business (id, name, created_at, updated_at)
	VALUES ($1, $2, NOW(), NOW());`;

	try {
		await client.queryArray({
			text: String.raw`${query}`,
			args: [id, name]
		});
	} catch (error) {
		console.error(error);
		return c.text(`error: "Internal Server Error"`);
	}

	const resultQuery = `
	select id from business where name = $1 order by created_at desc limit 1;`

	try {
		const ids = await client.queryArray({
			text: String.raw`${resultQuery}`,
			args: [name]
		});

		return c.json({
			"business_id": `${ids.rows[0][0]}`
		});
	} catch (error) {
		return c.json({
			"business_id": `${error}`
		});
	}
})

app.post('/survey/:survey-id', async (c) => {
	// Connect to DB to get the survey
	const id = c.req.param('survey-id')

	const query = `
	select questions from survey where id = $1 order by created_at desc limit 1;`

	try {
		const qna = await client.queryArray({
			text: String.raw`${query}`,
			args: [id]
		});

		return c.json(qna.rows[0][0] as JSON);
	} catch (error) {
		return console.error(error);
	}
})

Deno.serve(app.fetch)
