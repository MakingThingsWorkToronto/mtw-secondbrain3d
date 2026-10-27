# Second brain in 3D

An independent Making Things Work experiment: https://secondbrain3d.makingthings.work/.

## Run

Node 24 or later, with no npm dependencies:

```sh
npm test
npm run dev
npm run build
```

The player runs on http://127.0.0.1:8793/. Vercel serves the static `dist/` folder. Run `npm run studio` for local asset inspection on port 8794.

The original HTML, scripts, models and bundled licences are included. The Blender generator is in `blender/brain_build.py`; install Blender separately to regenerate geometry.

[All experiments](https://www.makingthings.work/experiments/).
