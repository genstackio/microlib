export CI
s ?= patch

build: ## Build
	@yarn --silent build

clean: clean-modules clean-lib clean-coverage
clean-coverage: ## Remove test coverage directory
	@rm -rf coverage/
clean-lib: ## Remove lib directory
	@rm -rf lib/
	@rm -f tsconfig.tsbuildinfo
clean-modules: ## Remove Javascript dependencies directory
	@rm -rf node_modules/

install: ## Install the Javascript dependencies
	@yarn --silent install

pr:
	@hub pull-request -b master

publish: clean-lib
	@npm version $(s) -m "feat: %s" -f
	@npm publish

test: ## Execute the tests
	@CI=true yarn --silent test --all --color --coverage --detectOpenHandles
test-ci: ## Execute the tests
	@CI=true yarn --silent test --all --color --coverage --detectOpenHandles
test-cov: ## Execute the tests
	@yarn --silent test --coverage --detectOpenHandles
test-dev: ## Execute the tests
	@yarn --silent test --all --color --detectOpenHandles

.DEFAULT_GOAL := install
.PHONY: build \
		clean clean-coverage clean-modules \
		install \
		publish \
		test test-ci test-cov test-dev
