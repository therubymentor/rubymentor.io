require 'rubygems'
require 'bundler/setup'
require 'rack'
require 'rack/router'
require 'erb'
require 'stripe'

if ENV["RACK_ENV"] == "development"
  puts "booting in development mode"
  require 'byebug'
  require 'dotenv'
  Dotenv.load
end

Stripe.api_key = ENV.fetch("STRIPE_SECRET_KEY")
STRIPE_PUB_KEY = ENV.fetch("STRIPE_PUBLISHED_KEY")

use Rack::Static,
  :urls => ["/favicon.ico", "/images", "/javascripts", "/stylesheets"],
  :root => "public"

charge_customer = ->(env) {
  params = Rack::Request.new(env).params
  Stripe::Customer.create(
    email: params['stripeEmail'],
    source: params['stripeToken'],
    plan: params['plan']
  )
}

render = ->(template) {
  path = File.expand_path("../#{template}", __FILE__)
  ERB.new(File.read(path)).result(binding)
}

index = ->(env) {
  [
    200,
    {
      'Content-Type'  => 'text/html',
      'Cache-Control' => 'public, max-age=86400'
    },
    File.open('public/index.html', File::RDONLY)
  ]
}

plans = ->(env) {
  [
    200,
    {
      'Content-Type'  => 'text/html',
      'Cache-Control' => 'public, max-age=86400'
    },
    [ render.("public/plans.html.erb") ]
  ]
}

students = ->(env) {
  [
    200,
    {
      'Content-Type'  => 'text/html',
      'Cache-Control' => 'public, max-age=86400'
    },
    [ render.("public/students.html.erb") ]
  ]
}

buy = ->(env) {
  charge_customer.(env)
  [
    201,
    {
      'Content-Type'  => 'text/html',
      'Cache-Control' => 'public, max-age=86400'
    },
    ["You are on your way to a great career in software development. Jim will be emailing you to set up your appointment schedule!"]
  ]
}

router = Rack::Router.new do
  get "/"         => index
  post "/buy"     => buy
  get "/plans"    => students
  get "/students" => students
end

run router
