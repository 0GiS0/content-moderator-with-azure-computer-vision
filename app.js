'use strict';

const extractFrames = require('ffmpeg-extract-frames');
const sleep = require('sleep');
const async = require('async');
const fs = require('fs');
const path = require("path");
const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');
require('dotenv').config();
const computerVisionClient = new ComputerVisionClient(new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': process.env.COMPUTER_VISION_KEY } }), process.env.COMPUTER_VISION_ENDPOINT);


//Demo
const VIDEO_TO_TEST = "videos/YOUR_VIDEO.mp4"

const framesFolder = 'frames/';

function computerVision() {
    async.series([
        async function () {

            /** Measuring time **/
            console.time("analysis");

            /**
            * DETECT ADULT CONTENT
            * Detects "adult" or "racy" content that may be found in images. 
            * The score closer to 1.0 indicates racy/adult content.
            * Detection for both local and URL images.
            */
            console.log('-------------------------------------------------');
            console.log('DETECT ADULT CONTENT');
            console.log();

            let filenameWithOutExtension = path.basename(VIDEO_TO_TEST).split('.').slice(0, -1).join('.');
            let fullPathForThisVideo = `${framesFolder}${filenameWithOutExtension}/`;


            //Create a directory inside frames with the name of the file without extension
            if (!fs.existsSync(fullPathForThisVideo)) {
                fs.mkdirSync(`${fullPathForThisVideo}`);
            }

            //Get all frames            
            await extractFrames({
                input: VIDEO_TO_TEST,
                output: `${fullPathForThisVideo}frame-%d.png`
            });

            let adultFrames = [], goryFrames = [], racyFrames = [];
            const isIt = flag => flag ? 'is' : "isn't";

            let files = fs.readdirSync(fullPathForThisVideo);

            //Analyze every frame with Computer Vision
            for (var i = 0; i < files.length; i++) {

                try {
                    console.log(`Analyzing ${files[i]} ...`);

                    let data = fs.readFileSync(path.join(fullPathForThisVideo, files[i]));

                    let result = await (computerVisionClient.analyzeImageInStream(data, { visualFeatures: ['Adult'] }));

                    console.log(result);

                    result = result.adult;

                    if (result.isAdultContent) adultFrames.push({ file: files[i], ...result });
                    if (result.isGoryContent) goryFrames.push({ file: files[i], ...result });
                    if (result.isRacyContent) racyFrames.push({ file: files[i], ...result });


                    console.log(`This probably ${isIt(result.isAdultContent)} adult content (${result.adultScore.toFixed(4)} score)`);
                    console.log(`This probably ${isIt(result.isRacyContent)} racy content (${result.racyScore.toFixed(4)} score)`);
                    console.log(`This probably ${isIt(result.isRacyContent)} gore content (${result.goreScore.toFixed(4)} score)`);


                    sleep.msleep(5);

                } catch (error) {

                    console.log(`That did not go well: ${error} `);
                }
            };


            console.log(`########### FINAL RESULT ###########`);

            console.log(`Adult frames: ${adultFrames.length}`);
            // console.dir(adultFrames);
            console.log(`Racy frames: ${racyFrames.length}`);
            // console.dir(racyFrames);
            console.log(`Gory frames: ${goryFrames.length}`);
            // console.dir(goryFrames);

            console.log(`####################################`);

            console.timeEnd("analysis");

        },
        function () {
            return new Promise((resolve) => {
                resolve();
            })
        }
    ], (err) => {
        throw (err);
    });
}

computerVision();