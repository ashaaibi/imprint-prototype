import { Config } from "@remotion/cli/config";

// Crisp JPEG frames + overwrite the previous render. 1080p H.264 is the default codec.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
