
.PHONY: dev
dev:
	npx esbuild app.jsx --bundle --define:process.env.NODE_ENV=\"production\" \
		--outfile=out.js

.PHONY: watch
watch:
	npx esbuild src/app.jsx \
		--bundle --define:process.env.NODE_ENV=\"production\" \
		--inject:./src/jsx-shim.js \
		--jsx-factory=createElement --jsx-fragment=Fragment \
		--outfile=www/out.js \
		--watch
