module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['step-definitions/**/*.js'],
    format: ['progress-bar', 'json:reports/cucumber-report.json'],
    publishQuiet: true
  }
};
