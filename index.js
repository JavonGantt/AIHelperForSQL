import dotenv from 'dotenv';
dotenv.config({ path: '../ApiKeys/apiKeys.env' });
import express from "express"
import axios from "axios"
import bodyParser from "body-parser"
import OpenAI from 'openai';

const app = express();
const port = 3000;


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


const API_KEY = process.env.OPENAI_API_KEY
const assistantID = process.env.ASSISTANTNAME


const openai = new OpenAI({
  apiKey: API_KEY,
}); // Make sure your API key is configured



// This function will make a call to chatGPT Model gpt-3.5-turbo. If not wanting to use assistant, revisit this
// async function generateSQLQuery(queryDescription) {
//   const completion = await openai.chat.completions.create({
//     messages: [{ role: "user", content: queryDescription }],
//     model: "gpt-3.5-turbo",
//     max_tokens: 700
//   });
// }







// works, but doesn't return the assistants second message.
// async function generateSQLQuery(queryDescription) {

//   //initialize the conversation space
//   const thread = await openai.beta.threads.create();
//   //handles the message from the user
//   const message = await openai.beta.threads.messages.create(
//     thread.id,
//     {
//       role: "user",
//       content: queryDescription
//     }

//   )

//   const run = await openai.beta.threads.runs.create(
//     thread.id,
//     { 
//       assistant_id: assistantID
//     }
//   );

//   await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for the assistant to respond

//   const messages = await openai.beta.threads.messages.list(
//     thread.id,
//   );

//   // Assuming the second message in the list is the assistant's response
//  // Assuming messages.data is the array you've shown
// const messagesArray = messages.data; // or however you retrieve this array

// // Check if the first message is from the assistant and access its content
// if (messagesArray[0].role === 'assistant') {
//     const assistantMessageContent = messagesArray[0].content; // This is an array of objects

//     // Accessing the text of the message
//     // You'll need to determine the structure of the object inside content array
//     // Assuming it has a property like 'text'
//     const assistantMessageText = assistantMessageContent[0].text.value;

//     console.log( "assistant response" + assistantMessageText);

//     const response = await openai.chat.completions.create({
//       model: "ft:gpt-3.5-turbo-1106:personal::8jvEI4Vi",
//       messages: [
//         {
//           "role": "user",
//           "content": assistantMessageText
//         }
//       ],
//       temperature: 1,
//       max_tokens: 4096,
//       top_p: 1,
//       frequency_penalty: 0,
//       presence_penalty: 0,
//     });
  
//   console.log( "Final Message " + response.choices[0].message.content)

//   return  response.choices[0].message.content
// }

// }


async function generateSQLQuery(queryDescription) {

  //initialize the conversation space
  const thread = await openai.beta.threads.create();
  //handles the message from the user
  const message = await openai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: queryDescription
    }

  )

  const run = await openai.beta.threads.runs.create(
    thread.id,
    { 
      assistant_id: assistantID
    }
  );

  await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for the assistant to respond

  const messages = await openai.beta.threads.messages.list(
    thread.id,
  );
  console.log(messages.data[0].content[0].text.value)
    const assistantMessageText = messages.data[0].content[0].text.value;

    console.log( "assistant response" + assistantMessageText);

    const response = await openai.chat.completions.create({
      model: "ft:gpt-3.5-turbo-1106:personal::8jvEI4Vi",
      messages: [
        {
          "role": "user",
          "content": assistantMessageText
        }
      ],
      temperature: 1,
      max_tokens: 4096,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
  
  console.log( "Final Message " + response.choices[0].message.content)

  return  response.choices[0].message.content
}






// var text = "What table would give me a count of loyalty members"
// console.log(generateSQLQuery(text))



// async function generateSQLQuery(queryDescription){
//   const response = await openai.chat.completions.create({
//     model: "ft:gpt-3.5-turbo-1106:personal::8jvEI4Vi",
//     messages: [
//       {
//         "role": "user",
//         "content": queryDescription
//       }
//     ],
//     temperature: 1,
//     max_tokens: 4096,
//     top_p: 1,
//     frequency_penalty: 0,
//     presence_penalty: 0,
//   });

// console.log(response.choices[0].message.content)
// return  response.choices[0].message.content
// }






app.get("/", async (req, res) => {
    try {
      // Pass the JSON data as null
      res.render("main.ejs");
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error rendering the homepage' });
    }
  });



  

  app.post('/generate-sql', async (req, res) => {
    try {
        const userInput = req.body.query;
        const userOption = req.body.option;
        const database = req.body.database
        const aiRequest = userInput
        //  + " " + userOption


        const aiResponse = await generateSQLQuery(aiRequest)
        res.json({ sql: aiResponse})
    } catch (error) {
        res.status(500).send("Error processing your request");
        console.log(error)
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });