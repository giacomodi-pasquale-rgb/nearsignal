require 'json'
require 'fileutils'

sources = ARGV.fetch(0).split(',')
destination = ARGV.fetch(1, 'data/zip')
allowed_regions = %w[AL AK AS AZ AR CA CO CT DE DC FL GA GU HI ID IL IN IA KS KY LA ME MD MA MI FM MN MS MO MT NE NV NH NJ NM NY NC ND MP OH OK OR PA PR RI SC SD TN TX UT VT VI VA WA WV WI WY MH PW]
territory_regions = %w[AS FM GU MH MP PR PW VI]
records = {}

sources.each do |source|
  File.foreach(source, encoding: 'UTF-8') do |line|
    country, postal_code, place_name, _state_name, region, _county, _county_code, _community, _community_code, latitude, longitude = line.chomp.split("\t", -1)
    region = country if territory_regions.include?(country)
    next unless (country == 'US' || territory_regions.include?(country)) && postal_code.match?(/\A\d{5}\z/) && allowed_regions.include?(region)
    lat = Float(latitude, exception: false)
    lon = Float(longitude, exception: false)
    next unless lat && lon
    records[postal_code] ||= [place_name, region, lat, lon]
  end
end

FileUtils.mkdir_p(destination)
(0..9).each do |prefix|
  shard = records.select { |postal_code, _| postal_code.start_with?(prefix.to_s) }.sort.to_h
  File.write(File.join(destination, "#{prefix}.json"), JSON.generate(shard))
end

puts "Generated #{records.length} U.S. ZIP records in 10 shards."
