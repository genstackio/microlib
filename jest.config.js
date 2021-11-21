module.exports = {
    rootDir: '.',
    modulePaths: ['<rootDir>'],
    moduleNameMapper: {
        '~(.*)$': '<rootDir>/$1',
        "\\.css$": "identity-obj-proxy",
        "\\.(ttf|eot|svg)": "identity-obj-proxy",
        "^lodash-es$": "lodash"
    },
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js'],
    transform: {".ts$": "ts-jest"},
    testMatch: ['**/__tests__/**/*.spec.ts'],
    coverageDirectory: './coverage',
};