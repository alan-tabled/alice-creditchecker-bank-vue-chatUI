<script>
// import axios from 'axios';
import fetch from 'node-fetch';
import { Wallet, Contract, AlchemyProvider } from 'ethers';

export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data() {
    return {
      enableHolderCreditScoreRequest: true,
      enableHolderLoanRequest: false,
      holderOutputContent:'',
      creditCheckerOutputContent:'',
      bankOutputContent:'',
      enableHolderProvideCreditScoreInput: false,
      ethereumAddress: '',
      creditScoreNumber:'',
      creditScoreSecret:'',
      inMessage: '',
      myMessage: '',
      messages: [],  
      providedCreditScoreNumber: false,
      providedCreditScoreSecret: false,
      providedEthereumAddress: false,
      credentialResponseJSON: '',
    }
  },

  async mounted() {
    this.ALICE_DWN = process.env.VUE_APP_ALICE_DWN;
    this.HOST = process.env.VUE_APP_HOST;
    this.PORT = process.env.VUE_APP_PORT;
    this.LOG_PATH = process.env.VUE_APP_LOG_PATH;
    this.CREDIT_CHECKER_DWN = process.env.VUE_APP_CREDIT_CHECKER_DWN;
    this.BANK_DWN = process.env.VUE_APP_BANK_DWN;
    this.CREDENTIAL_ENDPOINT = process.env.VUE_APP_CREDENTIAL_ENDPOINT;
    this.ISSUER = JSON.parse(process.env.VUE_APP_ISSUER);
    this.CREDIT_SCORE_NUMBER = process.env.VUE_APP_CREDIT_SCORE_NUMBER;
    this.CREDIT_SCORE_SECRET = process.env.VUE_APP_CREDIT_SCORE_SECRET;
    // Smart contract env variables
    this.PRIVATE_KEY = process.env.VUE_APP_PRIVATE_KEY;
    this.ALCHEMY_API_KEY = process.env.VUE_APP_ALCHEMY_API_KEY;
    this.BANK_ADDRESS = process.env.VUE_APP_BANK_ADDRESS;
    this.BANK_ABI = process.env.VUE_APP_BANK_ABI;
    // DWN protocol
    this.PROTOCOL = process.env.VUE_APP_PROTOCOL;
    this.PROTOCOLPATH = process.env.VUE_APP_PROTOCOLPATH;
    this.SCHEMA = process.env.VUE_APP_SCHEMA;

    // set random score between 500 - 1000 to Alice
    const min = 500;
    const max = 1000;
    this.ALICE_CREDIT_SCORE = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`ALICE_CREDIT_SCORE: ${this.ALICE_CREDIT_SCORE}`);
  },

  methods: {
    resetCreditScore() {

      this.enableHolderCreditScoreRequest = true;
      this.enableHolderProvideCreditScoreInput = false;
      this.ethereumAddress = '';
      this.creditScoreNumber = '';
      this.creditScoreSecret = '';
      this.holderOutputContent = '';
      this.creditCheckerOutputContent = '';
      this.bankOutputContent = '';
      this.credentialResponseJSON = '';
    },

    async requestCreditScore() {
      this.enableHolderCreditScoreRequest = false;
      await this.sendMessageIn("Welcome to Credit Checker. My name is Bob. What can I do for you?");
      await this.sendMessageOut("Hello, my name is Alice.");
      await this.sendMessageOut("I want to get my credit score credential.");
      await this.sendMessageIn("OK. You want to get your credit score credential.");
      await this.sendMessageIn("You may need to provide your credit score number and secret for us to validate and issue the credit score credential to you if the credit score number and secret are valid.");
      this.requestCreditNumberAndSecret();
      this.enableHolderProvideCreditScoreInput = true;
    },

    async requestCreditNumberAndSecret() {

      if(!this.providedCreditScoreNumber && !this.providedCreditScoreSecret){
        await this.sendMessageIn("Could you please provide your credit score number? (Hint: it's 12345)");

      }else if(this.providedCreditScoreNumber && !this.providedCreditScoreSecret){
        await this.sendMessageIn("Could you please provide your credit score secret? (Hint: it's 67890)");

      }else{
        await this.sendMessageIn('Validating your credit score number and secret. Please wait.',5);

        if(this.creditScoreNumber != this.CREDIT_SCORE_NUMBER || this.creditScoreSecret != this.CREDIT_SCORE_SECRET){
          await this.sendMessageIn("The credit score number or secret is not valid.");
          await this.sendMessageIn("You may need to provide a valid credit score number and secret again.");
          this.providedCreditScoreNumber=false;
          this.providedCreditScoreSecret=false;
          this.requestCreditNumberAndSecret();
          return;
        }

        await this.sendMessageIn("Your credit score number and secret are valid. Please wait a moment and we will issue the credit score credential to you.");
        await this.requestingDIDConnectionEstablishment();
        await this.issueCreditScoreCredential();
      }
    },

    async checkSubmitProcess(){
      if(this.providedCreditScoreNumber==false){
        this.creditScoreNumber=this.myMessage;
        await this.sendMessageOut(this.myMessage);
        this.providedCreditScoreNumber=true;
        this.requestCreditNumberAndSecret();

      }else if(this.providedCreditScoreSecret==false){
        this.creditScoreSecret=this.myMessage;
        await this.sendMessageOut(this.myMessage);
        this.providedCreditScoreSecret=true;
        this.requestCreditNumberAndSecret();
      
      }else if(this.providedEthereumAddress==false){
        this.ethereumAddress=this.myMessage;
        await this.sendMessageOut(this.myMessage);
        this.providedEthereumAddress=true;
        this.setCreditScore();
      }
    },

    async requestingDIDConnectionEstablishment(){
      await this.sendMessageIn('Requesting DID connection establishment');
      await this.sendMessageOut('Accept DID connection establishment');
    },

    async issueCreditScoreCredential(){
      // get Alice DWN DID
      const AliceDWNDid = await this.fetchURL(this.ALICE_DWN + '/myDid','GET','','');
        // console.log(`AliceDWNDid: ${AliceDWNDid}`);
        await this.sendMessageIn('Issuing credit score credential. Please wait...',3);

        
        // console.log(`this.ISSUER ${JSON.parse(this.ISSUER)}`);
        const credentialContent = {
          holder: {
            did: AliceDWNDid
          },
          issuer: {
            did: this.ISSUER.did,
            publicKeyHex: this.ISSUER.keys[0].publicKeyHex,
            privateKeyHex: this.ISSUER.keys[0].privateKeyHex,
            kid: this.ISSUER.keys[0].kid
          },
          credential: {
            credentialType: "Credit Score",
            provider: {
              brand: "Credit Score Checker",
            },
            creditScore: {
              name: "Alice",
              score: this.ALICE_CREDIT_SCORE
            }
          }
        };

        // issue credential
        console.log(`credentialContent: ${JSON.stringify(credentialContent)}`);

        const credentialResponse = await this.fetchURL(this.CREDENTIAL_ENDPOINT + '/api/credentials',
        'POST',
        {'Content-Type': 'application/json'},
        JSON.stringify(credentialContent));

        this.credentialResponseJSON = JSON.parse(credentialResponse);
        // issue credential to Alice
        const shareCredentialContentToAlice = {
            targetDid: AliceDWNDid,
            data: this.credentialResponseJSON,
            protocol: this.PROTOCOL,
            protocolPath: this.PROTOCOLPATH,
            schema: this.SCHEMA
        }

        // send credential to Alice's DWN
        const shareCredentialContentToAliceResponse = await this.fetchURL(this.CREDIT_CHECKER_DWN + '/record/shareRecord',
        'POST',
        {'Content-Type': 'application/json'},
        JSON.stringify(shareCredentialContentToAlice));
        
        const shareCredentialContentToAliceResponseJSON = JSON.parse(shareCredentialContentToAliceResponse);
        if(shareCredentialContentToAliceResponseJSON.code==202){
          await this.sendMessageIn('The credit score credential is issued to you.',3);
          await this.sendMessageOut('I have received credit score credential. Thanks.');
          await this.sendMessageIn('Is there anything else I can work for you?',2);
          await this.sendMessageOut('No, thanks.',2);
          await this.sendMessageIn('Have a good day. Goodbye');
          this.enableHolderLoanRequest = true;

        }else{
          await this.sendMessageIn('There is a problem when issuing credit score credential. Please try again later');
        }
    },

    
    async requestLoan(){
      this.clearAllMessages();
      this.enableHolderLoanRequest = false;
      await this.sendMessageIn("Welcome to dBank. My name is Claire. What can I do for you?");
      await this.sendMessageOut("Hello, my name is Alice.");
      await this.sendMessageOut("I want to apply loan.");
      await this.sendMessageIn("OK. You may need to provide your credit score credential proof to apply your loan.");
      await this.sendMessageIn("Do you have any credit score credential?");
      await this.sendMessageOut("Yes, I have.");
      await this.sendMessageIn("Great! Could you please share you credit score credential to me for verification?");
      await this.sendMessageOut("Sure.");
      
      await this.requestingDIDConnectionEstablishment();
      await this.sendMessageOut("Sharing credit score credential.");
      await this.verifyCreditScoreCredential();

    },

    async verifyCreditScoreCredential(){
      // get bank DWN DID
        const bankDWNDid = await this.fetchURL(this.BANK_DWN + '/myDid','GET','','');

        // share credential to bank
        const shareCredentialContentToBank = {
            targetDid: bankDWNDid,
            data: this.credentialResponseJSON,
            protocol: this.PROTOCOL,
            protocolPath: this.PROTOCOLPATH,
            schema: this.SCHEMA
        }

        // send credential to Alice's DWN
        const shareCredentialContentToBankResponse = await this.fetchURL(this.ALICE_DWN + '/record/shareRecord',
          'POST',
          {'Content-Type': 'application/json'},
          JSON.stringify(shareCredentialContentToBank)
        );

        const shareCredentialContentToBankResponseJSON = JSON.parse(shareCredentialContentToBankResponse);
        if(shareCredentialContentToBankResponseJSON.code==202){
          await this.sendMessageIn("Received your credit score credential.");
          await this.sendMessageIn("Please wait, we may verify your credit score credential.");
          await this.sendMessageIn("Veriifying credit score credential.");

          const verifyCredentialResponse = await this.fetchURL(this.CREDENTIAL_ENDPOINT + '/api/credentials/verify',
            'POST',
            {'Content-Type': 'application/json'},
            JSON.stringify({credential: this.credentialResponseJSON.proof.jwt})
          );
            console.log(`verifyCredentialResponse: ${verifyCredentialResponse}`);

            const verifyCredentialResponseJSON = JSON.parse(verifyCredentialResponse);

            if(verifyCredentialResponseJSON.verified.verified==true){
              await this.sendMessageIn("Veriification is completed. Your credit score credential is valid.");
              await this.sendMessageIn("We will now update your credit score so you can take out a loan.");
              await this.sendMessageIn("Could you please provide your Ethereum Address?");
              
            }else{
              await this.sendMessageIn("Your credit score credential is invalid. Please prepare a valid credit score credential and try again later");
            }

        }
    },

    async setCreditScore(){
      await this.sendMessageIn("Please wait, we are setting your credit score in the dBank app.");
      // Whitelist Alice's address
      const provider = new AlchemyProvider('arbitrum-goerli', this.ALCHEMY_API_KEY);
      const signer = new Wallet(this.PRIVATE_KEY, provider);
      const bankContract = new Contract(this.BANK_ADDRESS, this.BANK_ABI, signer);
      try {
        const tx = await bankContract.setCreditScore(this.ethereumAddress, this.ALICE_CREDIT_SCORE);
        console.log('Tx: ', tx);
        await this.sendMessageIn(`
          Sucessfully set your credit score, the transaction can be found here: https://goerli.arbiscan.io/tx/${tx.hash}.
          You can now go back to dBank to take out a loan.
        `);
        await this.sendMessageOut("Great, thanks.");
        await this.sendMessageIn('Is there anything else I can work for you?',2);
        await this.sendMessageOut('No.',2);
        await this.sendMessageIn('Have a good day. Cheers.');
        await this.sendMessageOut('Cheers.');
      } catch (err) {
        console.log(err);
      }
    },

    async fetchURL(tokenEndpoint, method, headers, body){
        let requestOptions = {};
        requestOptions = {...requestOptions, method};
        requestOptions = headers ? {...requestOptions, headers} : requestOptions;
        requestOptions = body ? {...requestOptions, body} : requestOptions;

        const response = await fetch(`${tokenEndpoint}`, requestOptions).then(response => response.text());
        return response;
    },

    holderOutputBox(e){
      this.holderOutputContent = e.target.innerText;
    },
    issuerOutputBox(e){
      this.creditCheckerOutputContent = e.target.innerText;
    },
    verifierOutputBox(e){
      this.bankOutputContent = e.target.innerText;
    },

    async sendMessageIn(message, delayTime){
      this.inMessage = message;
      await this.sendMessage('in', delayTime);
    },

    async sendMessageOut(message, delayTime){
      this.myMessage = message;
      await this.sendMessage('out', delayTime);
    },

    async sendMessage(direction, delayTime) {
      const setDelayTime = delayTime || 1;
      if (!this.myMessage && !this.inMessage) {
        return
      }
          if (direction === 'out') {
            this.messages.push({body: this.myMessage, author: 'you'})
            this.myMessage = ''
          } else if (direction === 'in') {
            this.messages.push({body: this.inMessage, author: 'otherUser'})
            this.inMessage = ''
          } else {
            alert('something went wrong')
          }
          this.$nextTick(() => {
            let messageDisplay = this.$refs.chatArea
            messageDisplay.scrollTop = messageDisplay.scrollHeight
          });

          await this.delay(setDelayTime * 1000);

    },

    clearAllMessages() {
      this.messages = []
    },

    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
}
</script>
<template>
  <div class="credit-score">
    <div class="headline">
      Demonstration
    </div>
    <section ref="chatArea" class="chat-area">
      <p
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="{ 'message-out': message.author === 'you', 'message-in': message.author !== 'you' }"
      >
        {{ message.body }}
      </p>
    </section>
    <div v-if="enableHolderCreditScoreRequest">
      <button @click="requestCreditScore">Step 1: Request Credit Score Credential</button>
    </div>
    <div v-if="enableHolderCreditScoreRequest==false && enableHolderLoanRequest==false">
      <form @submit.prevent="checkSubmitProcess()" id="person2-form">
        <label for="person2-input">Alice</label>
        <input v-model="myMessage" id="person2-input" type="text" placeholder="Type your message" />
        <button type="submit">Send</button>
      </form>
    </div>
    <div v-if="enableHolderLoanRequest">
      <button @click="requestLoan">Step 2: Set Credit Score in dBank</button>
    </div>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}


.headline {
  text-align: center;
  font-weight: 100;
  color: black;
  margin-bottom: 10px;
}
.chat-area {
/*   border: 1px solid #ccc; */
  background: white;
  height: 80vh;
  padding: 1em;
  overflow: auto;
  max-width: 800px;
  margin: 0 auto 2em auto;
  box-shadow: 2px 2px 5px 2px rgba(0, 0, 0, 0.3)
}
.message {
  width: 45%;
  border-radius: 10px;
  padding: .5em;
/*   margin-bottom: .5em; */
  font-size: .8em;
}
.message-out {
  background: #407FFF;
  color: white;
  margin-left: 50%;
  text-align: right;
}
.message-in {
  background: #F1F0F0;
  color: black;
  text-align: left;
}
.chat-inputs {
  display: flex;
  justify-content: space-between;
}
#person1-input {
  padding: .5em;
}
#person2-input {
  padding: .5em;  
}
</style>
